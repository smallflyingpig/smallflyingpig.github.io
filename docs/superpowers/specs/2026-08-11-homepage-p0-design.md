# Homepage P0 Optimization Design

## Goal

Fix the mobile navigation blocker and refresh the public homepage wording without exposing detailed information about work at Meituan.

## Scope

### Mobile navigation

- Keep the existing desktop sidebar and layout unchanged.
- Hide the sidebar by default at viewport widths up to 768px.
- Replace the clickable menu `div` with a semantic `button`.
- Keep `aria-expanded` synchronized with the sidebar state.
- Show a backdrop while the mobile sidebar is open.
- Close the mobile sidebar when the backdrop is clicked, Escape is pressed, or a section link is selected.
- Do not show the backdrop on desktop.

### Public positioning

- Keep the sidebar role concise: `高级工程师 @ 美团` / `Senior Engineer @ Meituan`.
- Describe current work only as large-language-model research and development.
- Do not mention internal projects, datasets, pipelines, repositories, metrics, code-pretraining responsibilities, or organizational details.
- Keep the Chinese and English descriptions semantically aligned.
- Leave historical education, employment, publications, patents, awards, services, and links unchanged.

### Explicitly excluded

- Do not edit or regenerate `paper/jiguo_cv.pdf`.
- Do not redesign the homepage, blog, typography, palette, or information architecture.
- Do not add new claims, achievements, dates, or confidential details.

## Content

Chinese current-role sentence:

> 目前在美团担任高级工程师，从事大语言模型相关研发工作。

English current-role sentence:

> I am currently a Senior Engineer at Meituan, working on large language models.

## Verification

- Add automated regression checks for mobile default state, semantic menu controls, close interactions, synchronized accessibility state, bilingual public wording, and the unchanged CV file.
- Run the checks before and after implementation to establish the red-green cycle.
- Render the Chinese homepage at desktop and mobile viewport sizes.
- Confirm the mobile first screen shows homepage content rather than an open sidebar.
- Confirm the desktop sidebar remains visible and usable.
- Confirm `paper/jiguo_cv.pdf` is byte-for-byte unchanged.
