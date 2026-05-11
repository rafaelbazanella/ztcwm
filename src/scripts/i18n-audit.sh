#!/usr/bin/env bash
# src/scripts/i18n-audit.sh — Phase 19 / I18N-01 / I18N-02
# Re-runnable. Exits 0 on clean, 1 on any PT match.
# DO NOT wire into npm test / lint / pre-commit (CONTEXT.md D-06).

set -u

# Resolve src/ root (script lives in src/scripts/, audit target is src/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# D-02 exclusions: tests, build output, vendor docs
# (`.planning/`, `.docs/`, `docs/`, `.TODO.md`, README.md are outside src/, so already out of scope)
EXCLUDES=(
    --include="*.ts"
    --include="*.html"
    --exclude="*.test.ts"
    --exclude-dir="dist"
    --exclude-dir="node_modules"
)

# D-03 Pass 1 — PT accent class (case-sensitive — the regex covers both cases explicitly)
ACCENT_RE='[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]'

# D-03 Pass 2 — PT token list. Locked seed from CONTEXT.md D-03 + three additions justified
# in 19-RESEARCH.md § "PT Token List Audit".
TOKEN_RE='\b(editar|excluir|salvar|cancelar|adicionar|aguarde|carregar|carregando|sair|entrar|voltar|pr[oó]ximo|anterior|pesquisar|buscar|mostrando|nenhum|vazio|confirmar|a[cç][õo]es|sucesso|aviso|usu[aá]rio|senha|pendente|conex[aã]o|inv[aá]lido|obrigat[oó]rio|falha|conectado|desconectado|rede|membro|gerenciar|administrador|configura[cç]|controlador|painel|in[íi]cio|recarregar|sincronizar|enviar|selecionar)\b'

hits=0

echo "Pass 1: accent class"
if LC_ALL=C grep -rE "${ACCENT_RE}" "${SRC_ROOT}" "${EXCLUDES[@]}"; then
    hits=1
fi

echo "Pass 2: PT token list"
if LC_ALL=C grep -rEi "${TOKEN_RE}" "${SRC_ROOT}" "${EXCLUDES[@]}"; then
    hits=1
fi

if [ "${hits}" -eq 0 ]; then
    echo "Audit clean — no PT strings found in src/ under D-01/D-02 filters."
    exit 0
fi
echo "Audit FAILED — see hits above. Fix per D-08 (inline replacement)."
exit 1
