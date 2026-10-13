# Full stack learning documents

Start with [the Word teaching guide](full-stack-learning-guide.docx). Its editable source is [full-stack-learning-guide.md](full-stack-learning-guide.md).

For any AI assistant, read [AI_MEMORY.md](../AI_MEMORY.md) first. It records requirements, repository facts, proposed decisions, verification, and the next action. Keep it updated after each development session.

The [October 1 architecture research](solutions-architecture-plan.md) remains historical context. The October 5 teaching guide records Java and Spring Boot as the confirmed primary backend, with Python reserved for later AI learning.

To regenerate the Word file, use a Python environment with `python-docx`:

```bash
python docs/tools/build_learning_guide.py
```

Render and inspect the resulting document before sharing an updated version. The generator does not validate product implementation or deployments.
