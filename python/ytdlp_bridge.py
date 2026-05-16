"""
yt-dlp Python bridge called from Kotlin via Chaquopy.

All functions return JSON strings so results are easy to pass across the JNI boundary.
"""

import json
import yt_dlp


def _safe_format(f):
    return {
        "format_id": f.get("format_id"),
        "ext": f.get("ext"),
        "resolution": f.get("resolution"),
        "filesize": f.get("filesize"),
        "filesize_approx": f.get("filesize_approx"),
        "vcodec": f.get("vcodec"),
        "acodec": f.get("acodec"),
        "fps": f.get("fps"),
        "tbr": f.get("tbr"),
        "abr": f.get("abr"),
        "vbr": f.get("vbr"),
        "quality": f.get("quality"),
        "format_note": f.get("format_note"),
    }


def get_video_info(url):
    """Return serialised metadata for a URL without downloading anything."""
    ydl_opts = {"quiet": True, "no_warnings": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return json.dumps({
                "id": info.get("id"),
                "title": info.get("title"),
                "description": info.get("description", ""),
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader"),
                "uploader_url": info.get("uploader_url"),
                "view_count": info.get("view_count"),
                "like_count": info.get("like_count"),
                "webpage_url": info.get("webpage_url"),
                "extractor": info.get("extractor"),
                "formats": [_safe_format(f) for f in info.get("formats", [])],
            })
    except Exception as e:
        return json.dumps({"error": str(e)})


def download_video(url, output_path, format_id=None):
    """
    Download a video/audio stream.

    output_path: absolute Android path, e.g. /sdcard/Download/%(title)s.%(ext)s
    format_id:   yt-dlp format selector string, or None for the default best quality
    Returns JSON with {success, output_path} or {error}.
    """
    finished_file = {"path": output_path}

    def _progress(d):
        if d["status"] == "finished":
            finished_file["path"] = d.get("filename", output_path)

    ydl_opts = {
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [_progress],
        "noprogress": True,
    }
    if format_id:
        ydl_opts["format"] = format_id

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return json.dumps({"success": True, "output_path": finished_file["path"]})
    except Exception as e:
        return json.dumps({"error": str(e)})
