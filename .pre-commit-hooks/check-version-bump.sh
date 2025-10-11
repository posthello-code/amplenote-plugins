#!/bin/bash

# Get current branch name
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD)

# Only check version bump on main branch
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "ℹ️  Skipping version check (not on main branch)"
  exit 0
fi

# Function to bump patch version
bump_patch_version() {
  local current_version=$1
  local major=$(echo "$current_version" | cut -d. -f1)
  local minor=$(echo "$current_version" | cut -d. -f2)
  local patch=$(echo "$current_version" | cut -d. -f3)
  local new_patch=$((patch + 1))
  echo "$major.$minor.$new_patch"
}

# Determine if this is a pre-push or pre-commit hook
# Check PRE_COMMIT_HOOK_TYPE environment variable set by pre-commit
if [ "$PRE_COMMIT_FROM_REF" != "" ] || [ "$PRE_COMMIT_TO_REF" != "" ]; then
  # This is a pre-push hook - check if ANY files are being pushed
  REMOTE_REF="origin/main"

  # Check if there are any commits being pushed (any file changes)
  if ! git diff --quiet HEAD "$REMOTE_REF" 2>/dev/null; then
    # Get current version (what we're pushing)
    CURRENT_VERSION=$(git show HEAD:package.json | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/')

    # Get remote version (what's on origin)
    REMOTE_VERSION=$(git show "$REMOTE_REF":package.json 2>/dev/null | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/' || echo "0.0.0")

    # Extract patch versions
    CURRENT_PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
    REMOTE_PATCH=$(echo "$REMOTE_VERSION" | cut -d. -f3)

    if [ "$CURRENT_PATCH" -le "$REMOTE_PATCH" ]; then
      echo "❌ Error: patch version must be bumped before pushing to main"
      echo "   Remote version: $REMOTE_VERSION"
      echo "   Local version:  $CURRENT_VERSION"
      echo ""
      echo "   Cannot auto-bump during push. Please run:"
      echo "   git reset --soft HEAD~1"
      echo "   # Edit package.json to bump version"
      echo "   git add package.json"
      echo "   git commit"
      exit 1
    else
      echo "✓ Patch version bumped: $REMOTE_VERSION → $CURRENT_VERSION"
    fi
  fi
else
  # This is a pre-commit hook - check if ANY files are staged
  if ! git diff --cached --quiet; then
    # Get the version from package.json in working tree
    CURRENT_VERSION=$(cat package.json | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/')

    # Get the version from HEAD (last commit)
    HEAD_VERSION=$(git show HEAD:package.json 2>/dev/null | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/' || echo "0.0.0")

    # Extract patch version (third number)
    CURRENT_PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
    HEAD_PATCH=$(echo "$HEAD_VERSION" | cut -d. -f3)

    # Check if patch version was bumped
    if [ "$CURRENT_PATCH" -le "$HEAD_PATCH" ]; then
      # Auto-bump the patch version
      NEW_VERSION=$(bump_patch_version "$HEAD_VERSION")

      echo "🔧 Auto-bumping patch version: $HEAD_VERSION → $NEW_VERSION"

      # Update package.json
      sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
      rm -f package.json.bak

      # Stage the updated package.json
      git add package.json

      echo "✓ Version bumped and staged"
    else
      echo "✓ Patch version already bumped: $HEAD_VERSION → $CURRENT_VERSION"
    fi
  fi
fi

exit 0
