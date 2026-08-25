#!/usr/bin/env python3
"""Chunked injection of REDUCED code into Ox Alpha chat."""
import subprocess
import sys

FILE_PATH = "/home/z/my-project/upload/core_code.txt"
CHUNK_SIZE = 80000

def js_escape(s):
    return (
        s.replace("\\", "\\\\")
         .replace("`", "\\`")
         .replace("$", "\\$")
         .replace("\0", "")
    )

def run_eval(js_code):
    result = subprocess.run(
        ["agent-browser", "eval", js_code],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f"  STDERR: {result.stderr[:300]}")
    return result.stdout.strip()

with open(FILE_PATH, "r", encoding="utf-8") as f:
    code_content = f.read()

print(f"File size: {len(code_content)} chars")

# Step 1: Init buffer
print("Step 1: Init buffer...")
out = run_eval('window.__b = ""; "ok"')
print(f"  -> {out}")

# Step 2: Inject instruction
instruction = "這是一個 Android Kotlin Compose 專案「Sylphora」的核心程式碼（共22個關鍵檔案）。請詳細分析每個檔案的功能、主要函數、UI 結構和資料流。\n\n"
escaped = js_escape(instruction)
print(f"Step 2: Instruction ({len(instruction)} chars)...")
out = run_eval(f'window.__b += `{escaped}`; "ok"')
print(f"  -> {out}")

# Step 3: Chunked inject
chunks = [code_content[i:i+CHUNK_SIZE] for i in range(0, len(code_content), CHUNK_SIZE)]
print(f"Step 3: {len(chunks)} chunks...")
for idx, chunk in enumerate(chunks):
    escaped = js_escape(chunk)
    js = f'window.__b += `{escaped}`; "chunk {idx+1}/{len(chunks)}"'
    out = run_eval(js)
    print(f"  Chunk {idx+1}/{len(chunks)} -> {out}")

# Step 4: Set textarea
print("Step 4: Set textarea...")
js_set = '''(() => {
  const textarea = document.querySelector("textarea");
  if (!textarea) return "ERROR: no textarea";
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(textarea, window.__b);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  const len = window.__b.length;
  delete window.__b;
  return "SUCCESS: " + len + " chars";
})()'''
out = run_eval(js_set)
print(f"  -> {out}")
print("\nDone!")