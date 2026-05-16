// @ts-check
const {
  withSettingsGradle,
  withAppBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const CHAQUOPY_VERSION = "15.0.1";
const CHAQUOPY_MAVEN = "https://chaquo.com/maven";

const isKotlinDSL = (contents) => contents.includes('maven(') || contents.includes('id(');

/** Add Chaquopy Maven repo + plugin declaration to settings.gradle(.kts) */
function withChaquopySettings(config) {
  return withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("chaquo.com/maven")) {
      if (isKotlinDSL(contents)) {
        // Kotlin DSL: insert after first repository entry inside pluginManagement.repositories
        contents = contents.replace(
          /pluginManagement\s*\{([\s\S]*?repositories\s*\{)/,
          (match) =>
            match.replace(
              /repositories\s*\{/,
              `repositories {\n        maven("${CHAQUOPY_MAVEN}")`
            )
        );
      } else {
        // Groovy DSL
        contents = contents.replace(
          /pluginManagement\s*\{([\s\S]*?repositories\s*\{)/,
          (match) =>
            match.replace(
              /repositories\s*\{/,
              `repositories {\n        maven { url "${CHAQUOPY_MAVEN}" }`
            )
        );
      }
    }

    // Add plugin version declaration inside pluginManagement (after repositories block)
    if (!contents.includes("com.chaquo.python")) {
      const pluginLine = isKotlinDSL(contents)
        ? `    id("com.chaquo.python") version "${CHAQUOPY_VERSION}"`
        : `    id 'com.chaquo.python' version '${CHAQUOPY_VERSION}'`;

      if (contents.match(/pluginManagement\s*\{[\s\S]*?plugins\s*\{/)) {
        // Append inside existing plugins { } block
        contents = contents.replace(/(pluginManagement[\s\S]*?plugins\s*\{)/, `$1\n${pluginLine}`);
      } else {
        // No plugins block — add one before the end of pluginManagement
        const chaquopyPluginsBlock = `\nplugins {\n${pluginLine}\n}\n`;
        contents = contents.replace(
          /(pluginManagement\s*\{[\s\S]*?)(^\})/m,
          `$1${chaquopyPluginsBlock}$2`
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

/** Apply Chaquopy plugin + configure pip inside app/build.gradle(.kts) */
function withChaquopyAppBuild(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const kts = isKotlinDSL(contents);

    // Apply plugin
    if (!contents.includes("com.chaquo.python")) {
      const pluginLine = kts
        ? `    id("com.chaquo.python")`
        : `    id 'com.chaquo.python'`;
      contents = contents.replace(/(plugins\s*\{)/, `$1\n${pluginLine}`);
    }

    // Add ndk abiFilters
    if (!contents.includes("abiFilters")) {
      const ndk = kts
        ? `        ndk {\n            abiFilters += listOf("arm64-v8a", "x86_64")\n        }`
        : `        ndk {\n            abiFilters "arm64-v8a", "x86_64"\n        }`;
      contents = contents.replace(/(defaultConfig\s*\{)/, `$1\n${ndk}`);
    }

    // Add python pip block
    if (!contents.includes("python {")) {
      const pip = kts
        ? `        python {\n            pip {\n                install("yt-dlp")\n            }\n        }`
        : `        python {\n            pip {\n                install 'yt-dlp'\n            }\n        }`;
      contents = contents.replace(/(defaultConfig\s*\{)/, `$1\n${pip}`);
    }

    config.modResults.contents = contents;
    return config;
  });
}

/** Write the Python bridge script into android/app/src/main/python/ */
function withPythonBridge(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.projectRoot;
      const src = path.join(root, "python", "ytdlp_bridge.py");
      const dstDir = path.join(root, "android", "app", "src", "main", "python");

      if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(dstDir, "ytdlp_bridge.py"));
      }
      return config;
    },
  ]);
}

/** Write Kotlin native module files into android/app/src/main/java/<package>/modules/ytdlp/ */
function withYtDlpKotlin(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.projectRoot;
      const pkg = config.android?.package ?? "com.tikdown.app";
      const pkgPath = pkg.replace(/\./g, "/");
      const javaDir = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        pkgPath,
        "modules",
        "ytdlp"
      );

      if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });

      const modulePkg = `${pkg}.modules.ytdlp`;

      fs.writeFileSync(
        path.join(javaDir, "YtDlpModule.kt"),
        generateYtDlpModule(modulePkg)
      );
      fs.writeFileSync(
        path.join(javaDir, "YtDlpPackage.kt"),
        generateYtDlpPackage(modulePkg)
      );
      return config;
    },
  ]);
}

/** Register YtDlpPackage in MainApplication.kt */
function withYtDlpMainApplication(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.projectRoot;
      const pkg = config.android?.package ?? "com.tikdown.app";
      const pkgPath = pkg.replace(/\./g, "/");
      const mainAppPath = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        pkgPath,
        "MainApplication.kt"
      );

      if (!fs.existsSync(mainAppPath)) return config;

      let contents = fs.readFileSync(mainAppPath, "utf-8");
      const importLine = `import ${pkg}.modules.ytdlp.YtDlpPackage`;

      // Add import if missing
      if (!contents.includes("YtDlpPackage")) {
        contents = contents.replace(
          /^(package .+\n)/m,
          `$1\n${importLine}\n`
        );

        // Register package inside getPackages().apply { }
        contents = contents.replace(
          /PackageList\(this\)\.packages\.apply\s*\{/,
          `PackageList(this).packages.apply {\n                add(YtDlpPackage())`
        );
      }

      fs.writeFileSync(mainAppPath, contents);
      return config;
    },
  ]);
}

function generateYtDlpModule(pkg) {
  return `package ${pkg}

import com.chaquo.python.PyException
import com.chaquo.python.Python
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = YtDlpModule.NAME)
class YtDlpModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "YtDlp"
    }

    override fun getName() = NAME

    @ReactMethod
    fun getVideoInfo(url: String, promise: Promise) {
        Thread {
            try {
                val result = Python.getInstance()
                    .getModule("ytdlp_bridge")
                    .callAttr("get_video_info", url)
                    .toString()
                promise.resolve(result)
            } catch (e: PyException) {
                promise.reject("YTDLP_PYTHON_ERROR", e.message ?: "Python error", e)
            } catch (e: Exception) {
                promise.reject("YTDLP_ERROR", e.message ?: "Unknown error", e)
            }
        }.start()
    }

    @ReactMethod
    fun downloadVideo(url: String, outputPath: String, formatId: String?, promise: Promise) {
        Thread {
            try {
                val result = Python.getInstance()
                    .getModule("ytdlp_bridge")
                    .callAttr("download_video", url, outputPath, formatId)
                    .toString()
                promise.resolve(result)
            } catch (e: PyException) {
                promise.reject("YTDLP_PYTHON_ERROR", e.message ?: "Python error", e)
            } catch (e: Exception) {
                promise.reject("YTDLP_ERROR", e.message ?: "Unknown error", e)
            }
        }.start()
    }
}
`;
}

function generateYtDlpPackage(pkg) {
  return `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class YtDlpPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(YtDlpModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;
}

const withChaquopy = (config) => {
  config = withChaquopySettings(config);
  config = withChaquopyAppBuild(config);
  config = withPythonBridge(config);
  config = withYtDlpKotlin(config);
  config = withYtDlpMainApplication(config);
  return config;
};

module.exports = withChaquopy;
