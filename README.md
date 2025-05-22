# Chontaduro Labeler

A Visual Studio Code extension that analyzes and displays multiple code metrics for your active file.

## Features

This extension adds a sidebar view that shows the current file name and various code metrics including:

- Line count
- If statement count
- Using statement count
- Loop count
- Lambda expression count
- Method count
- Average method size

All metrics update automatically when you switch files or make changes to the current file.

## How to Use

1. Click on the LineCounter icon in the activity bar (the sidebar).
2. The view will display the current file name and all the code metrics.
3. The metrics update automatically as you edit the file or switch between files.

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X on macOS)
3. Search for "Chontaduro Labeler"
4. Click Install

### From VSIX File
1. Download the .vsix file from the releases page
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X on macOS)
4. Click on the "..." menu (top-right of the Extensions view)
5. Select "Install from VSIX..."
6. Navigate to and select the downloaded .vsix file

## Building and Running

If you want to build and run the extension from source:

1. Clone the repository:
   ```
   git clone https://github.com/your-username/chontaduro-labeler.git
   cd chontaduro-labeler
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run compile
   ```

4. Launch the extension in development mode:
   - Press F5 in VS Code with the project open
   - This will open a new VS Code window with the extension loaded

5. Package the extension (optional):
   ```
   npm run vscode:prepublish
   npx vsce package
   ```
   This will create a .vsix file that can be installed in VS Code.

## Requirements

No special requirements or dependencies.

## Extension Settings

This extension does not add any configurable settings.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release of Chontaduro Labeler with multiple code metrics functionality:
- Line count
- If statement count
- Using statement count
- Loop count
- Lambda expression count
- Method count
- Average method size
