// @ts-check
const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const CHAQUOPY_VERSION = "15.0.1";
const CHAQUOPY_MAVEN = "https://chaquo.com/maven";

/**
 * Add Chaquopy to root build.gradle:
 *   - buildscript.repositories  → Maven URL for plugin resolution
 *   - buildscript.dependencies  → plugin classpath
 *   - allprojects.repositories  → Maven URL for runtime artifacts
 */
function withChaquopyRootBuild(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const buildPath = path.join(
        config.modRequest.projectRoot,
        "android",
        "build.gradle"
      );
      if (!fs.existsSync(buildPath)) return config;

      let c = fs.readFileSync(buildPath, "utf-8");
      const mavenBlock = `        maven { url "${CHAQUOPY_MAVEN}" }`;

      // buildscript.repositories
      if (!c.includes("chaquo.com")) {
        c = c.replace(
          /(buildscript\s*\{[\s\S]*?repositories\s*\{)/,
          `$1\n${mavenBlock}`
        );
      }

      // buildscript.dependencies classpath
      if (!c.includes("com.chaquo.python:gradle")) {
        c = c.replace(
          /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/,
          `$1\n        classpath "com.chaquo.python:gradle:${CHAQUOPY_VERSION}"`
        );
      }

      // allprojects.repositories (needed for Chaquopy runtime artifacts)
      if (c.includes("allprojects") && !c.includes("chaquo.com")) {
        c = c.replace(
          /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
          `$1\n${mavenBlock}`
        );
      }

      fs.writeFileSync(buildPath, c);
      return config;
    },
  ]);
}

/**
 * Add `apply plugin: "com.chaquo.python"` to app/build.gradle.
 * Also ensures the ndk + python blocks are in defaultConfig.
 */
function withChaquopyAppBuild(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const buildPath = path.join(
        config.modRequest.projectRoot,
        "android",
        "app",
        "build.gradle"
      );
      if (!fs.existsSync(buildPath)) return config;

      let c = fs.readFileSync(buildPath, "utf-8");

      // apply plugin — insert after the last existing apply plugin line
      if (!c.includes("com.chaquo.python")) {
        c = c.replace(
          /(apply plugin: "com\.facebook\.react")/,
          `$1\napply plugin: "com.chaquo.python"`
        );
      }

      // ndk abiFilters
      if (!c.includes("abiFilters")) {
        c = c.replace(
          /(defaultConfig\s*\{)/,
          `$1\n        ndk {\n            abiFilters "arm64-v8a", "x86_64"\n        }`
        );
      }

      // python pip block
      if (!c.includes("python {")) {
        c = c.replace(
          /(defaultConfig\s*\{)/,
          `$1\n        python {\n            pip {\n                install 'yt-dlp'\n            }\n        }`
        );
      }

      fs.writeFileSync(buildPath, c);
      return config;
    },
  ]);
}

/** Copy Python bridge script into android/app/src/main/python/ */
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

/** Write Kotlin YtDlpModule + YtDlpPackage into the app's java source tree */
function withYtDlpKotlin(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.projectRoot;
      const pkg = config.android?.package ?? "com.tikdown.app";
      const javaDir = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...pkg.split("."),
        "modules",
        "ytdlp"
      );

      if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });
      const modulePkg = `${pkg}.modules.ytdlp`;

      fs.writeFileSync(path.join(javaDir, "YtDlpModule.kt"), ytDlpModuleKt(modulePkg));
      fs.writeFileSync(path.join(javaDir, "YtDlpPackage.kt"), ytDlpPackageKt(modulePkg));
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
      const mainAppPath = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...pkg.split("."),
        "MainApplication.kt"
      );
      if (!fs.existsSync(mainAppPath)) return config;

      let c = fs.readFileSync(mainAppPath, "utf-8");
      if (c.includes("YtDlpPackage")) return config; // idempotent

      const importLine = `import ${pkg}.modules.ytdlp.YtDlpPackage`;
      c = c.replace(/^(package .+\n)/m, `$1\n${importLine}\n`);
      c = c.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        `PackageList(this).packages.apply {\n                add(YtDlpPackage())`
      );

      fs.writeFileSync(mainAppPath, c);
      return config;
    },
  ]);
}

// ─── Kotlin source templates ─────────────────────────────────────────────────

function ytDlpModuleKt(pkg) {
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

function ytDlpPackageKt(pkg) {
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
  config = withChaquopyRootBuild(config);
  config = withChaquopyAppBuild(config);
  config = withPythonBridge(config);
  config = withYtDlpKotlin(config);
  config = withYtDlpMainApplication(config);
  return config;
};

module.exports = withChaquopy;
