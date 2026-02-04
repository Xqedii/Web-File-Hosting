# Xqedii File Hosting
[![Release](https://img.shields.io/badge/release-1.0-blue)](https://github.com/Xqedii/Web-File-Hosting) 
[![Discord](https://img.shields.io/badge/Discord-Join-7289DA?logo=discord&logoColor=white)](https://discord.com/invite/6JQfeQEB4W)

**Web Panel for Storing and Editing Files**
An advanced, modern web panel that allows secure file storage and easy editing together with other users in a shared editor.

This panel must not be used for intentional actions that harm other servers!
It is intended solely for testing your own server, for example to test anti-bot and anti-crash protections.

-----

# Overview

The main panel includes a sidebar containing the primary folders, recent files, favorite files, and a trash bin with recently deleted files.

In the center of the page, there is a list of files from the folder you are currently in, along with additional elements such as the user profile, search bar, and buttons for sorting and creating files.

On the right side, there is a file sorting panel where you can customize the order in which files are displayed on the page.

<img width="2341" height="1270" alt="image" src="https://github.com/user-attachments/assets/d0908df8-a8e2-4196-871f-3b5df257b919" />

-----

# File Editor

The file editor features syntax highlighting, making code easier to read and edit. Each file can be edited by multiple users at the same time, allowing real-time collaborative editing with your friends or teammates.

At the very bottom of the screen, the currently open files are displayed, allowing for quick and easy switching between files.

## Additional Features
Each file can be liked, which adds it to a special category for easier access to important files.

Every deleted file is moved to the Trash Bin, preventing accidental permanent deletions.

Support for .zip files, including file compression and the ability to open archives directly in the file editor.

Real-time folder updates means every user can see what is happening in a given folder instantly. All changes are immediately synchronized and shared with other users.

The search bar allows you to easily find files stored on the server, so you don’t have to manually browse through folders to locate the file you need.

-----

# Installation
To install the application, clone the repository and then run:

```csharp
npm install -y
npm run dev
```

After a short moment, the fully working application will be available at http://localhost:3000.

> [!NOTE]
> The accounts available for login can be found in the users file inside the data folder. The default password for both the public and admin accounts is **password**.
