import re
return re.sub(
    br"(?mi)^Co-Authored-By:\s*Claude Sonnet 4\.6 <noreply@anthropic\.com>\r?\n?",
    b"",
    message
)
