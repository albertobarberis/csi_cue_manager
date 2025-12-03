# Project Collaboration for Cue Manager in Max / MSP
Alberto Barberis
Federico Pezzatini
Davide Broggini

## Overview
Make a description of the Project ... (TODO)
...
...

Save your local/specific example in local_examples (This are not saved in the repo!)
Save general ecamples in general_examples (This are saved in the repo)

# How to collaborate# Project Collaboration Guide

## Prerequisites
- Git installed on your local machine
- Access to the repository
- VS Code (or your preferred code editor)
- Max/MSP (if working with Max patches)

## Getting Started

### First Time: Setup

Clone the repository to your local folder:

```bash
cd <path to the folder>
git clone <repository-url>
```

## Development Workflow

### 1. Select a correct branch

You can chose to work directly on the `development` branch:

```bash
cd <path to the folder>
git checkout development
git pull
```

Or you can create a Feature Branch (Recommended):

```bash
cd <path to the folder>
git checkout development
git pull
git checkout -b feature/your-feature-name
```

### 2. Update Your Local Repository

Before starting any work, always update your local repository:

```bash
git fetch
git pull origin development  # Get latest changes from development
```

### 3. Make Your Changes

- Open and modify your code using VS Code (JavaScript, Max/MSP patches, etc.)
- Test your code thoroughly in your local environment
- Ensure everything works as expected before proceeding
- Save all your changes in VS Code

### 4. Commit Your Changes

Make small, logical commits as you work:

```bash
git status  # Review what has changed
git add .   # Or add specific files: git add path/to/file
git status  # Verify what will be committed
git commit -m "Brief description of what you changed"
```

**Good commit message examples:**
- `"Fix delay bug in Max patch"`

### 5. Push and Create Pull Request

Push your feature branch:

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub to merge into `development`. This allows for:
- Code review by team members
- Discussion before merging

### 6. After PR is Merged

Clean up your local branches:

```bash
git checkout development
git pull
git branch -d feature/your-feature-name  # Delete local feature branch
```

## General Github Best Practices

- **Use feature branches**: Create separate branches for each feature or fix (`feature/add-audio`, `fix/delay-bug`)
- **Never push directly to `main`**: Protect your main branch
- **Use Pull Requests**: Allow code review before merging to `development`
- **Test before committing**: Never push untested code
- **Write clear commit messages**: Use present tense ("Add feature" not "Added feature")
- **Commit often**: Make small, logical commits rather than large ones
- **Pull before you push**: Always fetch and pull before pushing to avoid conflicts
- **Keep commits focused**: One commit = one logical change
- **Review your changes**: Use `git diff` to see what you're about to commit
- **Don't commit sensitive data**: Use `.gitignore` for config files, API keys, etc.

## Handling Merge Conflicts

If you encounter a merge conflict:

1. Open the conflicted files in VS Code (it highlights conflicts clearly)
2. Choose which changes to keep or manually combine them
3. Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
4. Test your code after resolving
5. Stage and commit the resolved files:
   ```bash
   git add .
   git commit -m "Resolve merge conflict in [filename]"
   git push
   ```

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `git status` | Show working tree status |
| `git fetch` | Download updates from remote |
| `git pull` | Fetch and merge changes |
| `git branch` | List branches and show current branch |
| `git checkout <branch>` | Switch to a different branch |
| `git checkout -b <branch>` | Create and switch to new branch |
| `git add .` | Stage all changes |
| `git add <file>` | Stage specific file |
| `git commit -m "message"` | Commit staged changes |
| `git push origin <branch>` | Push branch to remote |
| `git diff` | Show unstaged changes |
| `git log` | View commit history |
| `git branch -d <branch>` | Delete local branch |

## Quick Tips

- **Undo last commit** (keeps changes): `git reset --soft HEAD~1`
- **See what changed**: `git diff` (unstaged) or `git diff --staged` (staged)
- **Discard local changes**: `git checkout -- <file>` (⚠️ careful, can't undo!)
- **View commit history**: `git log --oneline --graph`
- **Update branch name**: `git branch -m old-name new-name`

## Project Structure

```
project-root/
├── README.md
├── .gitignore
├── src/
│   ├── js/
│   └── max/
└── docs/
```

Make sure to keep your file organization clean and consistent.

## Troubleshooting

### Problem: "Your branch is behind"
**Solution**: Run `git pull` to get the latest changes

### Problem: "Your branch and origin have diverged"
**Solution**: 
```bash
git pull --rebase
# If conflicts occur, resolve them, then:
git rebase --continue
```

### Problem: Accidentally committed to wrong branch
**Solution**:
```bash
git reset --soft HEAD~1  # Undo commit, keep changes
git checkout correct-branch
git add .
git commit -m "Your message"
```
