#!/usr/bin/env python3
"""Chunked injection of code file into Ox Alpha chat via agent-browser."""
import subprocess
import sys

FILE_PATH = "/home/z/my-project/upload/all code.txt"
CHUNK_SIZE = 80000  # chars per chunk (safe margin under ARG_MAX)

def js_escape(s):
    """Escape for JS template literal."""
    return (
        s.replace("\\", "\\\\")
         .replace("`", "\\`")
         .replace("$", "\\$")
         .replace("\0", "")
    )

def run_eval(js_code):
    """Run agent-browser eval and return stdout."""
    result = subprocess.run(
        ["agent-browser", "eval", js_code],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f"  STDERR: {result.stderr[:300]}")
    return result.stdout.strip()

# Read file
with open(FILE_PATH, "r", encoding="utf-8") as f:
    code_content = f.read()

print(f"File size: {len(code_content)} chars")

# Step 1: Initialize buffer
print("Step 1: Initialize buffer...")
out = run_eval('window.__injectBuf = ""; "buffer init"')
print(f"  -> {out}")

# Step 2: Inject instruction
instruction = "請詳細分析以下程式碼的每個功能和模組，包括每個檔案的作用、主要函數、UI 結構、資料流等：\n\n"
escaped_instr = js_escape(instruction)
print(f"Step 2: Inject instruction ({len(instruction)} chars)...")
out = run_eval(f'window.__injectBuf += `{escaped_instr}`; "instruction added"')
print(f"  -> {out}")

# Step 3: Inject code in chunks
chunks = []
for i in range(0, len(code_content), CHUNK_SIZE):
    chunks.append(code_content[i:i+CHUNK_SIZE])

print(f"Step 3: Injecting {len(chunks)} chunks...")
for idx, chunk in enumerate(chunks):
    escaped = js_escape(chunk)
    js = f'window.__injectBuf += `{escaped}`; "chunk {idx+1}/{len(chunks)} done"'
    out = run_eval(js)
    print(f"  Chunk {idx+1}/{len(chunks)} ({len(chunk)} chars) -> {out}")

# Step 4: Set textarea value from buffer
print("Step 4: Setting textarea value...")
js_set = '''
(() => {
  const text = window.__injectBuf;
  const textarea = document.querySelector("textarea");
  if (!textarea) return "ERROR: no textarea";
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(textarea, text);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  delete window.__injectBuf;
  return "SUCCESS: set " + text.length + " chars";
})()
'''.strip()
out = run_eval(js_set)
print(f"  -> {out}")

print("\nInjection complete!")
