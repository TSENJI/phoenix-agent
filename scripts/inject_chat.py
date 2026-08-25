#!/usr/bin/env python3
"""Inject code file content into the Ox Alpha chat input via agent-browser."""
import subprocess
import json
import sys

FILE_PATH = "/home/z/my-project/upload/all code.txt"

def js_escape(s):
    """Escape a string for embedding in a JavaScript string literal."""
    return (
        s.replace("\\", "\\\\")
         .replace("`", "\\`")
         .replace("$", "\\$")
         .replace("'", "\\'")
         .replace('"', '\\"')
         .replace("\n", "\\n")
         .replace("\r", "\\r")
         .replace("\t", "\\t")
         .replace("\0", "\\0")
    )

# Read the file
with open(FILE_PATH, "r", encoding="utf-8") as f:
    code_content = f.read()

print(f"File size: {len(code_content)} chars")

# Build the prompt
instruction = "請詳細分析以下程式碼的每個功能和模組，包括每個檔案的作用、主要函數、UI 結構、資料流等：\n\n"
full_text = instruction + code_content

print(f"Full prompt size: {len(full_text)} chars")

# Escape for JavaScript
escaped = js_escape(full_text)

# Build the JavaScript - use chunked approach to avoid argument limits
js_code = f'''(async () => {{
  const text = `{escaped}`;
  const textarea = document.querySelector("textarea");
  if (!textarea) {{ return "ERROR: no textarea"; }}
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(textarea, text);
  textarea.dispatchEvent(new Event("input", {{ bubbles: true }}));
  textarea.dispatchEvent(new Event("change", {{ bubbles: true }}));
  return "SUCCESS: injected " + text.length + " chars";
}})()'''

print(f"JS code size: {len(js_code)} chars")
print("Running agent-browser eval...")

# Split into chunks if needed and inject via multiple eval calls
# But let's try the full thing first
result = subprocess.run(
    ["agent-browser", "eval", js_code],
    capture_output=True,
    text=True,
    timeout=30
)

print(f"stdout: {result.stdout}")
if result.stderr:
    print(f"stderr: {result.stderr[:500]}")
print(f"return code: {result.returncode}")
