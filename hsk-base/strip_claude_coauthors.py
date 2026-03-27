
from git_filter_repo import FilterRepo

TARGETS = [
    b"Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>",
    b"Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
]

def commit_callback(commit):
    if commit.message:
        lines = commit.message.splitlines(keepends=True)
        new_lines = []
        for line in lines:
            stripped = line.rstrip(b"\r\n")
            if stripped in TARGETS:
                continue
            new_lines.append(line)
        commit.message = b"".join(new_lines)

FilterRepo(commit_callback=commit_callback).run()
