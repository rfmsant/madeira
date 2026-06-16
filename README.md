# Madeira 2026 🌺 — App de viagem

App para tu + Rita fazerem tracking da viagem à Madeira (18–22 Jun), com:
- ✅ **Plano** diário com check-off por local e ícone 🐶 pet-friendly (Troy)
- 📷 **Fotos** por local (aparecem ao lado de cada atividade)
- 📰 **Feed** estilo Instagram (foto + legenda + comentários + likes), cronológico e live
- 🍴 **Sabores** — votação 0-10 de comidas/bebidas, votos dos dois visíveis live
- 🎬 **Montagem** final — slideshow cronológico de todas as fotos

Single-file (`index.html`), sem build step. React via CDN + Firebase (Firestore + Storage + Anonymous Auth).

---

## Setup (5 minutos)

### 1. Criar projeto Firebase
1. https://console.firebase.google.com → **Add project** (ou usa um existente).
2. No projeto: **Build → Firestore Database → Create database** (modo *production*, região `europe-west`).
3. **Build → Storage → Get started** (mesma região).
4. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**.

### 2. Obter a config web
1. **Project settings (⚙️) → General → Your apps → Web (</>)** → regista a app.
2. Copia o objeto `firebaseConfig`.
3. Em `index.html`, substitui o bloco `firebaseConfig` (procura por `REPLACE_ME`).

### 3. Publicar as regras
No mesmo console, cola o conteúdo de:
- `firestore.rules` → **Firestore → Rules → Publish**
- `storage.rules` → **Storage → Rules → Publish**

### 4. Nomes dos utilizadores (opcional)
Em `index.html`, no objeto `USERS`, muda `"Catarina"` para o nome certo da tua namorada.

---

## Deploy no GitHub Pages

```bash
# dentro de um repo novo (ex.: rfmsant/madeira)
git init
git add index.html
git commit -m "Madeira trip app"
git branch -M main
git remote add origin https://github.com/rfmsant/madeira.git
git push -u origin main
```

No GitHub: **Settings → Pages → Source: Deploy from a branch → main / root → Save**.
Fica em `https://rfmsant.github.io/madeira/`.

> Como é tudo client-side, GitHub Pages chega. Não precisas de Firebase Hosting (mas podes usar se preferires).

---

## Notas

- **Custos:** com Anonymous Auth + Firestore + Storage no plano gratuito (Spark), uma viagem a dois cabe folgadamente. As fotos são comprimidas para ~1280px / 72% qualidade antes do upload (~150–300KB cada).
- **"Adicionar à página inicial"** no telemóvel para parecer uma app nativa (Safari: Partilhar → Adicionar ao ecrã principal).
- **Dias 4 e 5** estão quase vazios de propósito — usa o botão **+ Adicionar local** dentro de cada dia (e o ✏️ para o título).
- **Exportar vídeo .mp4 real:** por agora o slideshow corre no ecrã e gravas com a gravação de ecrã do telemóvel. Se quiseres export automático com trajeto animado no mapa, é o próximo passo — diz-me.
- O voo de ida (18/6, 06:30→08:20) e de volta (22/6, 21:55→23:40) já estão como marcos nos dias 1 e 5.
