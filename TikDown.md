# TikDown API

Backend that streams social media profile video metadata via yt-dlp.

**Base URL:** `https://tik-down-backend.vercel.app`

---

## Endpoints

### `POST /tiktok`

Streams video metadata from a TikTok profile as NDJSON.
Session cookie is passed per-request in the JSON body — nothing is stored server-side.

#### Request Body (JSON)

| Field           | Required | Description |
|-----------------|----------|-------------|
| `u`             | Yes      | Username, `@username`, or full `https://www.tiktok.com/@username` URL |
| `tt_session_id` | Yes      | TikTok `sessionid` cookie value |
| `limit`         | No       | Max videos to return. Recommended max: 50. |

#### Example

```
POST /tiktok
Content-Type: application/json

{
  "u": "charlidamelio",
  "tt_session_id": "abc123...",
  "limit": 20
}
```

---

### `POST /instagram`

Streams post metadata from an Instagram profile as NDJSON.
Session cookie is passed per-request in the JSON body — nothing is stored server-side.

#### Request Body (JSON)

| Field           | Required | Description |
|-----------------|----------|-------------|
| `u`             | Yes      | Username, `@username`, or full `https://www.instagram.com/username/` URL |
| `ig_session_id` | Yes      | Instagram `sessionid` cookie value |
| `limit`         | No       | Max posts to return. Recommended max: 50. |

#### Example

```
POST /instagram
Content-Type: application/json

{
  "u": "natgeo",
  "ig_session_id": "49476777829%3Ajp9...",
  "limit": 20
}
```

---

## Response Format (both endpoints)

- **Content-Type:** `application/x-ndjson`
- **X-Cache:** `HIT` or `MISS` (5-minute server-side cache)
- Each newline-delimited line is a complete JSON object for one video/post.

### Video / Post Object Fields

| Field         | Type    | Description |
|---------------|---------|-------------|
| `id`          | string  | Unique video/post ID |
| `title`       | string  | Caption/title |
| `webpage_url` | string  | Full URL to the post |
| `url`         | string  | Fallback if `webpage_url` is absent |
| `thumbnail`   | string  | Thumbnail image URL |
| `thumbnails`  | array   | All thumbnails — last entry is highest quality |
| `duration`    | number  | Duration in seconds |
| `uploader`    | string  | Username of the uploader |
| `view_count`  | number? | View count (may be absent) |
| `like_count`  | number? | Like count (may be absent) |

### Error Response Shape

```json
{ "error": "Human-readable message", "detail": "Raw error (debug)" }
```

| Status | Condition |
|--------|-----------|
| `400`  | Missing or invalid `u` / malformed body |
| `401`  | Missing session cookie (`tt_session_id` / `ig_session_id`) |
| `404`  | Profile not found / no public posts |
| `405`  | Wrong HTTP method (GET on these routes) |
| `500`  | yt-dlp failed to initialize |
| `502`  | Could not reach TikTok / Instagram |

---

## Consuming the Stream

### Dart / Flutter

**TikTok**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> fetchTikTok(
  String username,
  String sessionId, {
  int limit = 20,
}) async {
  final uri = Uri.https('tik-down-backend.vercel.app', '/tiktok');
  final request = http.Request('POST', uri)
    ..headers['Content-Type'] = 'application/json'
    ..body = jsonEncode({'u': username, 'tt_session_id': sessionId, 'limit': limit});

  final response = await http.Client().send(request);
  if (response.statusCode != 200) {
    final body = await response.stream.bytesToString();
    throw Exception(jsonDecode(body)['error']);
  }

  final lines = response.stream
      .transform(utf8.decoder)
      .transform(const LineSplitter());

  await for (final line in lines) {
    if (line.trim().isEmpty) continue;
    final video = jsonDecode(line) as Map<String, dynamic>;
    // add to your state list
  }
}
```

**Instagram**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> fetchInstagram(
  String username,
  String sessionId, {
  int limit = 20,
}) async {
  final uri = Uri.https('tik-down-backend.vercel.app', '/instagram');
  final request = http.Request('POST', uri)
    ..headers['Content-Type'] = 'application/json'
    ..body = jsonEncode({'u': username, 'ig_session_id': sessionId, 'limit': limit});

  final response = await http.Client().send(request);
  if (response.statusCode != 200) {
    final body = await response.stream.bytesToString();
    throw Exception(jsonDecode(body)['error']);
  }

  final lines = response.stream
      .transform(utf8.decoder)
      .transform(const LineSplitter());

  await for (final line in lines) {
    if (line.trim().isEmpty) continue;
    final post = jsonDecode(line) as Map<String, dynamic>;
    // add to your state list
  }
}
```

---

### React Native / JavaScript

**TikTok**

```js
async function fetchTikTok(username, sessionId, limit = 20) {
  const res = await fetch('https://tik-down-backend.vercel.app/tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ u: username, tt_session_id: sessionId, limit }),
  });

  if (!res.ok) throw new Error((await res.json()).error);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        const video = JSON.parse(line);
        // append to your state array
      }
    }
  }
}
```

**Instagram**

```js
async function fetchInstagram(username, sessionId, limit = 20) {
  const res = await fetch('https://tik-down-backend.vercel.app/instagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ u: username, ig_session_id: sessionId, limit }),
  });

  if (!res.ok) throw new Error((await res.json()).error);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        const post = JSON.parse(line);
        // append to your state array
      }
    }
  }
}
```

---

### Swift (iOS)

**TikTok**

```swift
func fetchTikTok(username: String, sessionId: String, limit: Int = 20) async throws {
    let url = URL(string: "https://tik-down-backend.vercel.app/tiktok")!
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.httpBody = try JSONSerialization.data(withJSONObject: [
        "u": username, "tt_session_id": sessionId, "limit": limit
    ])
    let (stream, response) = try await URLSession.shared.bytes(for: req)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    for try await line in stream.lines {
        guard !line.isEmpty, let data = line.data(using: .utf8),
              let video = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { continue }
        // append to your @Published array
    }
}
```

**Instagram**

```swift
func fetchInstagram(username: String, sessionId: String, limit: Int = 20) async throws {
    let url = URL(string: "https://tik-down-backend.vercel.app/instagram")!
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.httpBody = try JSONSerialization.data(withJSONObject: [
        "u": username, "ig_session_id": sessionId, "limit": limit
    ])
    let (stream, response) = try await URLSession.shared.bytes(for: req)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    for try await line in stream.lines {
        guard !line.isEmpty, let data = line.data(using: .utf8),
              let post = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { continue }
        // append to your @Published array
    }
}
```

---

## Caching

- TTL: **5 minutes** per `profileUrl + limit + session ID tail`
- Cache hits replay stored lines instantly — no yt-dlp invocation
- Check `X-Cache: HIT` header to confirm

---

## Validation Rules

| Input | Rule |
|-------|------|
| TikTok username | 1–24 chars, `[a-zA-Z0-9_.]` |
| Instagram username | 1–30 chars, `[a-zA-Z0-9_.]` |
| `@username` | Leading `@` stripped before validation |
| Full URL | Must parse as valid URL with matching platform hostname |
| `limit` | Optional integer, recommended max **50** |
| Session IDs | URL-encoded values decoded automatically |
