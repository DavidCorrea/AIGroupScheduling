# Project Overview
- Found in `PROJECT.md`.

# Build and test commands
- Found in `PROJECT.md`.

# How to work
- All requests must be analyzed and split into units of work in such way that they can be done in parallel, if possible.
- Parallel work should be tacked by as many subagents as it is fit.

# UI
- Any client-facing content must be in Spanish.

# Code style guidelines
- Ensure clean code practices are followed
- Do not perform any changes without having explicit confirmation from the Prompter
- Explain all changes that are going to be done
- Document any new feature in `PROJECT.md` after it was implemented for easier context update. Do it under the `Features` section in a new list item.

# Testing instructions
- Use `Jest` library for testing.
- All tests are located under the `spec` folder.
- Every feature that is implemented needs to follow Test Driven Development practices.
- Tests are the documentation of the project, so their description should not contain technical terms. They need to describe real scenarios.

# Security considerations
- Any password that is stored in the application must not be stored in plain text.
- Passwords that will be stored must be hashed with `bcrypt` and must be "salted" with a unique and random salt, that will be also persisted alongside the hashed password.
- Passwords will then be checked by hashing the user's password attempt with the stored salt and compare the results.

# Database
- All migrations should require in the filename a general idea of what the migration is doing.

# Git
- All commits must only include related changes (e.g. related to the same feature or task being tackled)