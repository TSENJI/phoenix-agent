#!/usr/bin/env python3
"""Extract core files from the full code dump for chat injection."""
import re

INPUT = "/home/z/my-project/upload/all code.txt"
OUTPUT = "/home/z/my-project/upload/core_code.txt"

# Key files that represent the core functionality
KEY_FILES = [
    "metadata.json",
    "app/src/main/AndroidManifest.xml",
    "app/src/main/java/com/example/GameLauncherApp.kt",
    "app/src/main/java/com/example/GameViewModel.kt",
    "app/src/main/java/com/example/MainActivity.kt",
    "app/src/main/java/com/example/AppScanner.kt",
    "app/src/main/java/com/example/LauncherBridge.kt",
    "app/src/main/java/com/example/agent/AICuratorAgent.kt",
    "app/src/main/java/com/example/agent/CuratorRouter.kt",
    "app/src/main/java/com/example/agent/GameKnowledgeService.kt",
    "app/src/main/java/com/example/agent/TokenBudgetManager.kt",
    "app/src/main/java/com/example/scanner/RomScanner.kt",
    "app/src/main/java/com/example/research/ResearchEngine.kt",
    "app/src/main/java/com/example/database/AppDatabase.kt",
    "app/src/main/java/com/example/database/GameRepository.kt",
    "app/src/main/java/com/example/p3/asset/AssetDiscoveryService.kt",
    "app/src/main/java/com/example/p3/asset/AssetMatcher.kt",
    "app/src/main/java/com/example/ui/screens/LibraryScreen.kt",
    "app/src/main/java/com/example/ui/screens/CuratorScreen.kt",
    "app/src/main/java/com/example/ui/theme/ThemeManager.kt",
    "app/src/main/java/com/example/api/AiTransport.kt",
    "app/src/main/java/com/example/settings/SettingsRepository.kt",
]

with open(INPUT, "r", encoding="utf-8") as f:
    content = f.read()

# Split by file markers
file_pattern = re.compile(r'^=+$\nFILE: (.+?)\n=+$', re.MULTILINE)
matches = list(file_pattern.finditer(content))

extracted = []
for i, match in enumerate(matches):
    filename = match.group(1)
    if filename in KEY_FILES:
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        file_content = content[start:end].strip()
        extracted.append(f"{'='*80}\nFILE: {filename}\n{'='*80}\n{file_content}")
        print(f"  Included: {filename} ({len(file_content)} chars)")

total = "\n\n".join(extracted)
with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(total)

print(f"\nTotal extracted: {len(total)} chars across {len(extracted)} files")
print(f"Saved to: {OUTPUT}")