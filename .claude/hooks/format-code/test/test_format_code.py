"""Tests for format-code hook."""

import importlib.util
import os
import tempfile
from pathlib import Path


# Load module with hyphen in name using importlib
module_path = Path(__file__).parent.parent / "format-code.py"
spec = importlib.util.spec_from_file_location("format_code", module_path)
format_code = importlib.util.module_from_spec(spec)
spec.loader.exec_module(format_code)

# Import functions from loaded module
build_formatter_map = format_code.build_formatter_map
detect_language = format_code.detect_language
format_markdown = format_code.format_markdown
validate_formatter_entry = format_code.validate_formatter_entry
format_file = format_code.format_file


class TestDetectLanguage:
    """Tests for language detection."""

    def test_detect_json(self):
        assert detect_language('{"key": "value"}') == "json"
        assert detect_language("[1, 2, 3]") == "json"

    def test_detect_python(self):
        assert detect_language("def foo():\n    pass") == "python"
        assert detect_language("import os") == "python"
        assert detect_language("from pathlib import Path") == "python"

    def test_detect_javascript(self):
        assert detect_language("function foo() {}") == "javascript"
        assert detect_language("const x = 1") == "javascript"
        assert detect_language("() => {}") == "javascript"
        assert detect_language('console.log("hello")') == "javascript"

    def test_detect_typescript(self):
        assert detect_language('const x: string = "hello"') == "typescript"
        assert detect_language("interface Foo {}") == "typescript"

    def test_detect_bash(self):
        assert detect_language("#!/bin/bash\necho hello") == "bash"
        assert detect_language("if [ -f file ]; then\necho yes\nfi") == "bash"

    def test_detect_sql(self):
        assert detect_language("SELECT * FROM users") == "sql"
        assert detect_language("INSERT INTO table VALUES (1)") == "sql"

    def test_detect_yaml(self):
        assert detect_language("key: value") == "yaml"
        assert detect_language('name: "test"') == "yaml"

    def test_detect_text_fallback(self):
        assert detect_language("random text") == "text"
        assert detect_language("") == "text"


class TestFormatMarkdown:
    """Tests for markdown formatting."""

    def test_add_language_to_empty_fence(self):
        content = "```\ndef foo():\n    pass\n```\n"
        result = format_markdown(content)
        assert "```python" in result

    def test_preserve_existing_language(self):
        content = "```javascript\nconst x = 1\n```\n"
        result = format_markdown(content)
        assert "```javascript" in result

    def test_reduce_excessive_blank_lines_outside_fence(self):
        content = "line1\n\n\n\nline2\n"
        result = format_markdown(content)
        assert result == "line1\n\nline2\n"

    def test_preserve_blank_lines_inside_fence(self):
        """Issue 1: Blank lines inside code fences should be preserved."""
        content = '''```python
def foo():
    """


    Intentional spacing
    """
    pass
```
'''
        result = format_markdown(content)
        # Should preserve the 3+ blank lines inside the fence
        assert '"""\n\n\n' in result or '"""\n\n\n\n' in result

    def test_mixed_content(self):
        """Test content with both fences and excessive blank lines outside."""
        content = (
            "# Title\n\n\n\n"
            "Some text\n\n\n\n"
            "```python\n"
            "def foo():\n"
            "    pass\n"
            "```\n\n\n\n"
            "More text\n"
        )
        result = format_markdown(content)
        # Outside fences: reduced to 2 newlines max
        # Check before fence
        before_fence = result.split("```python")[0]
        assert "\n\n\n" not in before_fence
        # Check after fence
        after_fence = result.split("```\n")[-1]
        assert "\n\n\n" not in after_fence


class TestValidateFormatterEntry:
    """Tests for settings validation."""

    def test_valid_entry(self):
        entry = {
            "extensions": [".py"],
            "commands": [["ruff", "format", "{file}"]],
        }
        errors = validate_formatter_entry(entry, 0)
        assert errors == []

    def test_valid_entry_with_multiple_commands(self):
        entry = {
            "extensions": [".py"],
            "commands": [
                ["ruff", "format", "{file}"],
                ["ruff", "check", "--fix", "{file}"],
            ],
        }
        errors = validate_formatter_entry(entry, 0)
        assert errors == []

    def test_missing_extensions(self):
        entry = {"commands": [["ruff"]]}
        errors = validate_formatter_entry(entry, 0)
        assert any("extensions" in e for e in errors)

    def test_missing_commands(self):
        entry = {"extensions": [".py"]}
        errors = validate_formatter_entry(entry, 0)
        assert any("commands" in e for e in errors)

    def test_extensions_not_list(self):
        entry = {"extensions": ".py", "commands": [["ruff"]]}
        errors = validate_formatter_entry(entry, 0)
        assert any("must be a list" in e for e in errors)

    def test_commands_not_list(self):
        entry = {"extensions": [".py"], "commands": "ruff"}
        errors = validate_formatter_entry(entry, 0)
        assert any("must be a list" in e for e in errors)

    def test_command_not_list(self):
        entry = {"extensions": [".py"], "commands": ["ruff"]}
        errors = validate_formatter_entry(entry, 0)
        assert any("each command must be a list" in e for e in errors)

    def test_command_arg_not_string(self):
        entry = {"extensions": [".py"], "commands": [[123]]}
        errors = validate_formatter_entry(entry, 0)
        assert any("each command argument must be a string" in e for e in errors)

    def test_non_dict_entry(self):
        errors = validate_formatter_entry("invalid", 0)
        assert any("must be an object" in e for e in errors)


class TestBuildFormatterMap:
    """Tests for building formatter map."""

    def test_basic_mapping(self):
        settings = {
            "formatters": [
                {
                    "extensions": [".py"],
                    "commands": [["ruff", "format", "{file}"]],
                }
            ]
        }
        result = build_formatter_map(settings)
        assert ".py" in result
        assert result[".py"]["commands"] == [["ruff", "format", "{file}"]]
        assert result[".py"]["install_hint"] == ""

    def test_multiple_extensions(self):
        settings = {
            "formatters": [
                {
                    "extensions": [".js", ".ts"],
                    "commands": [["prettier", "--write", "{file}"]],
                }
            ]
        }
        result = build_formatter_map(settings)
        assert ".js" in result
        assert ".ts" in result

    def test_disabled_formatter(self):
        settings = {
            "formatters": [
                {
                    "extensions": [".py"],
                    "commands": [["ruff"]],
                    "enabled": False,
                }
            ]
        }
        result = build_formatter_map(settings)
        assert ".py" not in result

    def test_enabled_by_default(self):
        settings = {"formatters": [{"extensions": [".py"], "commands": [["ruff"]]}]}
        result = build_formatter_map(settings)
        assert ".py" in result

    def test_duplicate_extension_merge(self):
        """Duplicate extensions should merge commands."""
        settings = {
            "formatters": [
                {
                    "extensions": [".py"],
                    "commands": [["ruff", "format", "{file}"]],
                },
                {
                    "extensions": [".py"],
                    "commands": [["ruff", "check", "--fix", "{file}"]],
                },
            ]
        }
        result = build_formatter_map(settings)
        assert ".py" in result
        assert len(result[".py"]["commands"]) == 2
        assert ["ruff", "format", "{file}"] in result[".py"]["commands"]
        assert ["ruff", "check", "--fix", "{file}"] in result[".py"]["commands"]

    def test_case_insensitive_extension(self):
        settings = {
            "formatters": [{"extensions": [".PY", ".Py"], "commands": [["ruff"]]}]
        }
        result = build_formatter_map(settings)
        assert ".py" in result

    def test_invalid_entry_skipped(self, capsys):
        settings = {
            "formatters": [
                {"extensions": ".py"},  # Invalid: missing commands
                {"extensions": [".js"], "commands": [["prettier"]]},
            ]
        }
        result = build_formatter_map(settings)
        # Invalid entry should be skipped
        assert ".py" not in result
        assert ".js" in result
        # Warning should be printed
        captured = capsys.readouterr()
        assert "Warning" in captured.err


class TestFormatFile:
    """Tests for format_file function."""

    def test_file_not_found(self):
        success, message = format_file("/nonexistent/file.py", {})
        assert not success
        assert "not found" in message

    def test_no_formatter_configured(self):
        with tempfile.NamedTemporaryFile(suffix=".xyz", delete=False) as f:
            f.write(b"content")
            f.flush()
            try:
                success, message = format_file(f.name, {})
                assert success
                assert message == ""
            finally:
                os.unlink(f.name)

    def test_markdown_formatter(self):
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w") as f:
            f.write("```\ndef foo():\n    pass\n```\n")
            f.flush()
            try:
                formatter_map = {
                    ".md": {
                        "commands": [["__markdown__"]],
                        "install_hint": "",
                    }
                }
                success, message = format_file(f.name, formatter_map)
                assert success

                with open(f.name, "r") as rf:
                    content = rf.read()
                assert "```python" in content
            finally:
                os.unlink(f.name)

    def test_all_commands_executed(self, monkeypatch):
        """All commands should be executed sequentially."""
        called = []

        def mock_run_formatter(cmd_args, file_path):
            called.append(cmd_args[0])
            return "success"

        monkeypatch.setattr(format_code, "run_formatter", mock_run_formatter)

        with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
            f.write(b"x = 1")
            f.flush()
            try:
                formatter_map = {
                    ".py": {
                        "commands": [
                            ["fmt1", "{file}"],
                            ["lint1", "{file}"],
                        ],
                        "install_hint": "",
                    }
                }
                success, message = format_file(f.name, formatter_map)
                assert success
                # Both commands should have been executed
                assert called == ["fmt1", "lint1"]
                assert "fmt1" in message
                assert "lint1" in message
            finally:
                os.unlink(f.name)

    def test_failure_continues_to_next_command(self, monkeypatch):
        """If one command fails, other commands should still run."""
        called = []

        def mock_run_formatter(cmd_args, file_path):
            called.append(cmd_args[0])
            if cmd_args[0] == "fmt1":
                return "failed"
            return "success"

        monkeypatch.setattr(format_code, "run_formatter", mock_run_formatter)

        with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
            f.write(b"x = 1")
            f.flush()
            try:
                formatter_map = {
                    ".py": {
                        "commands": [
                            ["fmt1", "{file}"],
                            ["lint1", "{file}"],
                        ],
                        "install_hint": "",
                    }
                }
                success, message = format_file(f.name, formatter_map)
                assert success
                # Both commands attempted
                assert called == ["fmt1", "lint1"]
                # Only lint1 succeeded
                assert "lint1" in message
            finally:
                os.unlink(f.name)

    def test_partial_not_found_warns_on_stderr(self, monkeypatch, capsys):
        """If some commands succeed but others are missing, warn via stderr."""
        called = []

        def mock_run_formatter(cmd_args, file_path):
            called.append(cmd_args[0])
            if cmd_args[0] == "lint1":
                return "not_found"
            return "success"

        monkeypatch.setattr(format_code, "run_formatter", mock_run_formatter)

        with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
            f.write(b"x = 1")
            f.flush()
            try:
                formatter_map = {
                    ".py": {
                        "commands": [
                            ["fmt1", "{file}"],
                            ["lint1", "{file}"],
                        ],
                        "install_hint": "pip install lint1",
                    }
                }
                success, message = format_file(f.name, formatter_map)
                assert success
                assert "fmt1" in message
                # Warning about missing lint1 should appear on stderr
                captured = capsys.readouterr()
                assert "lint1" in captured.err
                assert "pip install lint1" in captured.err
            finally:
                os.unlink(f.name)

    def test_all_not_found_returns_error(self, monkeypatch):
        """If all commands are not_found, return error."""

        def mock_run_formatter(cmd_args, file_path):
            return "not_found"

        monkeypatch.setattr(format_code, "run_formatter", mock_run_formatter)

        with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
            f.write(b"x = 1")
            f.flush()
            try:
                formatter_map = {
                    ".py": {
                        "commands": [
                            ["fmt1", "{file}"],
                            ["lint1", "{file}"],
                        ],
                        "install_hint": "pip install fmt1",
                    }
                }
                success, message = format_file(f.name, formatter_map)
                assert not success
                assert "FORMAT ERROR" in message
                assert "fmt1" in message
                assert "lint1" in message
                assert "pip install fmt1" in message
            finally:
                os.unlink(f.name)
