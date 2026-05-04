1. **Fix Indirect Prompt Injection vulnerability in `src/app/api/analyze/route.ts`**
   - The endpoint fetches news from external sources and injects them directly into the LLM prompt. This allows malicious news articles to perform indirect prompt injection.
   - Wrap the `newsContext` in `<noticias_externas>` tags.
   - Add explicit system prompt instructions to strictly ignore any commands or directives found within the `<noticias_externas>` tags.
2. **Complete pre commit steps**
   - Run necessary checks and commands to ensure code quality.
3. **Submit the change**
   - Submit the PR with the required PR title format `🛡️ Sentinel: [Severity] Fix [vulnerability type]`.
