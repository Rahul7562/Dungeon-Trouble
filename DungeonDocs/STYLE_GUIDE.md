# Style Guide

This project strictly follows the formatting enforced by `.clang-format`.

## 1. Braces
Use Allman style (braces on a new line).
```cpp
if (condition)
{
    doSomething();
}
```

## 2. Indentation
4 spaces, no tabs.

## 3. Line Length
Maximum 100 characters per line.

## 4. Class Layout
1. `public` methods
2. `protected` methods
3. `private` methods
4. `private` members
Wait, strictly group data and functions logically.

## 5. Naming Recaps
* Classes: `PascalCase`
* Methods/Locals: `camelCase`
* Members: `m_camelCase`
* Statics: `s_camelCase`
* Macros: `UPPER_SNAKE_CASE`

## 6. Auto Usage
Use `auto` only when the type is obvious (e.g., `auto* obj = new Object();` or iterators). Do not use `auto` if it obscures readability.
