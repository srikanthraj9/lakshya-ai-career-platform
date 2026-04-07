LATEX_TEMPLATE = r"""
\documentclass[10pt]{{article}}
\usepackage[margin=0.6in]{{geometry}}
\usepackage[T1]{{fontenc}}
\usepackage[utf8]{{inputenc}}
\usepackage[hidelinks]{{hyperref}}
\usepackage{{enumitem}}
\setlist[itemize]{{leftmargin=1.2em,itemsep=2pt,topsep=2pt}}
\pagestyle{{empty}}
\setlength{{\parindent}}{{0pt}}
\begin{{document}}
\begin{{center}}
    {{\LARGE \textbf{{{name}}}}} \\
    {contact}
\end{{center}}

{content}

\end{{document}}
"""
