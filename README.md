## Welcome to Jiguo Li's Home Pages

I received the B.E. degree from Huazhong University of Science and Technology in 2016. I am currently a Ph.D. student of Institute of Computing Technology, Chinese Academy of Science. I am a visiting student in National Engineer Lab for Video Technology of Peking University, under the supervision by Prof. Wen Gao and Prof. Siwei Ma. My research interests include image generation, cross media analysis, and virtual reality.

Homepage: https://smallflyingpig.github.io

Email: jgli AT fudan.edu.cn / jiguo.li AT vipl.ict.ac.cn / jiguo_li AT qq.com


This homepage is forked and edited from https://github.com/liu-xb/liu-xb.github.io, and also welcome to fork the source code of my homepage.

## Build the blog

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build_blog.py
node --test tests/*.test.cjs
```

The generated HTML under `blog/posts/` is committed so GitHub Pages can serve it directly.
