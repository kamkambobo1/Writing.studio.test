(function () {
    const FAV_KEY = "mg-fav-poems";

    function favs() {
        try {
            return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
        } catch (e) {
            return [];
        }
    }

    function saveFavs(list) {
        localStorage.setItem(FAV_KEY, JSON.stringify(list));
    }

    function pageName() {
        return location.pathname.split("/").pop() || "index.html";
    }

    document.body.classList.add("mg-ready");

    /* reading progress */
    const poem = document.querySelector(".poem-text");
    if (poem) {
        const bar = document.createElement("div");
        bar.className = "mg-progress";
        document.body.appendChild(bar);

        window.addEventListener("scroll", function () {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (max <= 0 ? 0 : Math.min(100, (window.scrollY / max) * 100)) + "%";
        });
    }

    /* back to top */
    const topBtn = document.createElement("button");
    topBtn.className = "mg-top";
    topBtn.type = "button";
    topBtn.setAttribute("aria-label", "Back to top");
    topBtn.textContent = "↑";
    document.body.appendChild(topBtn);

    window.addEventListener("scroll", function () {
        topBtn.classList.toggle("show", window.scrollY > 400);
    });

    topBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* poem tools: size, favorite, share, listen */
    if (poem) {
        const tools = document.createElement("div");
        tools.className = "mg-tools";

        const smaller = document.createElement("button");
        smaller.className = "mg-btn";
        smaller.type = "button";
        smaller.textContent = "A−";

        const bigger = document.createElement("button");
        bigger.className = "mg-btn";
        bigger.type = "button";
        bigger.textContent = "A+";

        const favBtn = document.createElement("button");
        favBtn.className = "mg-btn";
        favBtn.type = "button";

        const shareBtn = document.createElement("button");
        shareBtn.className = "mg-btn";
        shareBtn.type = "button";
        shareBtn.textContent = "Share";

        const listenBtn = document.createElement("button");
        listenBtn.className = "mg-btn";
        listenBtn.type = "button";
        listenBtn.textContent = "Listen";

        tools.appendChild(smaller);
        tools.appendChild(bigger);
        tools.appendChild(favBtn);
        tools.appendChild(listenBtn);
        tools.appendChild(shareBtn);

        let speaking = false;

        function poemSpokenText() {
            return (poem.textContent || "")
                .replace(/\s+/g, " ")
                .replace(/---/g, "")
                .trim();
        }

        function stopListen() {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            speaking = false;
            listenBtn.textContent = "Listen";
            listenBtn.classList.remove("on");
        }

        function pickVoice() {
            const voices = window.speechSynthesis.getVoices() || [];
            const prefer = voices.filter(function (v) {
                return /en(-|_)?(GB|US|NG|ZA|IN|AU)?/i.test(v.lang || "");
            });
            return prefer[0] || voices[0] || null;
        }

        listenBtn.addEventListener("click", function () {
            if (!window.speechSynthesis) {
                listenBtn.textContent = "Not on this device";
                return;
            }

            if (speaking) {
                stopListen();
                return;
            }

            stopListen();

            const u = new SpeechSynthesisUtterance(poemSpokenText());
            u.rate = 0.92;
            u.pitch = 1;

            const voice = pickVoice();
            if (voice) u.voice = voice;

            u.onend = stopListen;
            u.onerror = stopListen;

            speaking = true;
            listenBtn.textContent = "Stop";
            listenBtn.classList.add("on");
            window.speechSynthesis.speak(u);
        });

        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = pickVoice;
        }

        window.addEventListener("pagehide", stopListen);

        poem.parentNode.insertBefore(tools, poem);

        let size = 1.05;

        smaller.addEventListener("click", function () {
            size = Math.max(0.9, size - 0.08);
            poem.style.fontSize = size + "rem";
        });

        bigger.addEventListener("click", function () {
            size = Math.min(1.4, size + 0.08);
            poem.style.fontSize = size + "rem";
        });

        const file = pageName();

        function paintFav() {
            const on = favs().indexOf(file) !== -1;
            favBtn.textContent = on ? "★ Saved" : "☆ Save";
            favBtn.classList.toggle("on", on);
        }

        paintFav();

        favBtn.addEventListener("click", function () {
            const list = favs();
            const i = list.indexOf(file);

            if (i === -1) list.push(file);
            else list.splice(i, 1);

            saveFavs(list);
            paintFav();
        });

        shareBtn.addEventListener("click", function () {
            openPoemCard();
        });
    }

    function excerptFromPoem() {
        const raw = (document.querySelector(".poem-text") || {}).textContent || "";

        const lines = raw.split(/\n/)
            .map(function (l) { return l.trim(); })
            .filter(function (l) {
                return l && l !== "---" && !/^Ibeakuzie/i.test(l);
            });

        let text = lines.slice(0, 3).join("\n");

        if (text.length > 160) {
            text = text.slice(0, 157).replace(/\s+\S*$/, "") + "…";
        }

        return text || "These words stayed.";
    }

    function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
        const paragraphs = text.split("\n");
        const out = [];

        paragraphs.forEach(function (para) {
            const words = para.split(/\s+/);
            let line = "";

            words.forEach(function (word) {
                const test = line ? line + " " + word : word;

                if (ctx.measureText(test).width > maxWidth && line) {
                    out.push(line);
                    line = word;
                } else {
                    line = test;
                }
            });

            if (line) out.push(line);
        });

        out.forEach(function (line, i) {
            ctx.fillText(line, x, y + i * lineHeight);
        });

        return out.length;
    }

    async function makePoemCard() {
        const titleEl = document.querySelector(".poem-title");
        const title = titleEl ? titleEl.textContent.trim() : "A poem";
        const excerpt = excerptFromPoem();

        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1080;

        const ctx = canvas.getContext("2d");

        function drawFallbackBackground() {
            const g = ctx.createLinearGradient(0, 0, 1080, 1080);
            g.addColorStop(0, "#0F172A");
            g.addColorStop(1, "#1E293B");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 1080, 1080);
        }

        const poemImg = document.querySelector(".poem-img");

        if (poemImg && poemImg.currentSrc) {
            try {
                const img = new Image();
                img.src = poemImg.currentSrc;

                await new Promise(function (resolve, reject) {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const scale = Math.max(1080 / img.width, 1080 / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (1080 - w) / 2;
                const y = (1080 - h) / 2;

                ctx.drawImage(img, x, y, w, h);

                const overlay = ctx.createLinearGradient(0, 0, 0, 1080);
                overlay.addColorStop(0, "rgba(5,10,20,0.76)");
                overlay.addColorStop(0.5, "rgba(5,10,20,0.62)");
                overlay.addColorStop(1, "rgba(5,10,20,0.82)");
                ctx.fillStyle = overlay;
                ctx.fillRect(0, 0, 1080, 1080);

                const vignette = ctx.createRadialGradient(540, 540, 250, 540, 540, 760);
                vignette.addColorStop(0, "rgba(0,0,0,0)");
                vignette.addColorStop(1, "rgba(0,0,0,0.42)");
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, 1080, 1080);
            } catch (e) {
                drawFallbackBackground();
            }
        } else {
            drawFallbackBackground();
        }

        ctx.strokeStyle = "rgba(251,191,36,0.72)";
        ctx.lineWidth = 5;
        ctx.strokeRect(54, 54, 972, 972);

        ctx.strokeStyle = "rgba(255,251,235,0.18)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(74, 74, 932, 932);

        ctx.fillStyle = "#FBBF24";
        ctx.font = "bold 24px Georgia, serif";
        ctx.fillText("MIDNIGHT & GOLD", 120, 150);

        ctx.fillStyle = "rgba(251,191,36,0.35)";
        ctx.fillRect(120, 177, 120, 2);

        ctx.fillStyle = "rgba(255,251,235,0.96)";
        ctx.font = "italic 72px Georgia, serif";
        ctx.fillText("“", 112, 280);

        ctx.fillStyle = "#FFFBEB";
        ctx.font = "italic 46px Georgia, serif";

        const quoteLines = wrapCanvasText(ctx, excerpt, 145, 345, 790, 68);
        const quoteBottom = 345 + Math.max(1, quoteLines) * 68;

        ctx.fillStyle = "rgba(255,251,235,0.22)";
        ctx.fillRect(145, quoteBottom + 30, 790, 1);

        ctx.fillStyle = "#FBBF24";
        ctx.font = "bold 30px Georgia, serif";
        ctx.fillText("Ibeakuzie Kamsiriochukwu", 145, quoteBottom + 88);

        ctx.fillStyle = "rgba(226,232,240,0.76)";
        ctx.font = "24px Georgia, serif";

        const safeTitle = title.length > 52
            ? title.slice(0, 49).replace(/\s+\S*$/, "") + "…"
            : title;

        ctx.fillText(safeTitle, 145, quoteBottom + 132);

        ctx.fillStyle = "rgba(251,191,36,0.9)";
        ctx.font = "bold 20px Georgia, serif";
        ctx.fillText("IBEAKUZIE KAMSI  •  POETRY", 145, 955);

        ctx.fillStyle = "rgba(226,232,240,0.55)";
        ctx.font = "18px Georgia, serif";
        ctx.fillText("ibeakuziekamsi.netlify.app", 145, 985);

        return canvas;
    }

    function canvasToFile(canvas, name) {
        return new Promise(function (resolve) {
            canvas.toBlob(function (blob) {
                resolve(new File([blob], name, { type: "image/png" }));
            }, "image/png");
        });
    }

    async function openPoemCard() {
        const titleEl = document.querySelector(".poem-title");
        const title = titleEl ? titleEl.textContent.trim() : "poem";
        const canvas = await makePoemCard();
        const dataUrl = canvas.toDataURL("image/png");
        const url = location.href;

        let modal = document.querySelector(".mg-card-modal");

        if (!modal) {
            modal = document.createElement("div");
            modal.className = "mg-card-modal";
            modal.innerHTML =
                '<div class="mg-card-box">' +
                '<img class="mg-card-preview" alt="Poetry card">' +
                '<div class="mg-tools">' +
                '<button type="button" class="mg-btn" data-act="share">Share card</button>' +
                '<button type="button" class="mg-btn" data-act="download">Download</button>' +
                '<button type="button" class="mg-btn" data-act="copy">Copy link</button>' +
                '<button type="button" class="mg-btn" data-act="close">Close</button>' +
                "</div></div>";

            document.body.appendChild(modal);

            modal.addEventListener("click", function (e) {
                if (e.target === modal) {
                    modal.classList.remove("show");
                }
            });
        }

        modal.querySelector(".mg-card-preview").src = dataUrl;
        modal.classList.add("show");

        const box = modal.querySelector(".mg-card-box");

        box.onclick = function (e) {
            const act = e.target.getAttribute("data-act");
            if (!act) return;

            if (act === "close") {
                modal.classList.remove("show");
            }

            if (act === "download") {
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = title.replace(/\s+/g, "-").toLowerCase() + "-card.png";
                a.click();
            }

            if (act === "copy" && navigator.clipboard) {
                navigator.clipboard.writeText(url);
                e.target.textContent = "Link copied";
                setTimeout(function () {
                    e.target.textContent = "Copy link";
                }, 1600);
            }

            if (act === "share") {
                canvasToFile(canvas, title.replace(/\s+/g, "-").toLowerCase() + "-card.png")
                    .then(function (file) {
                        const data = {
                            title: title + " — Ibeakuzie Kamsiriochukwu",
                            text: excerptFromPoem() + "\n— Ibeakuzie Kamsiriochukwu",
                            url: url
                        };

                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            return navigator.share({
                                title: data.title,
                                text: data.text,
                                url: data.url,
                                files: [file]
                            });
                        }

                        if (navigator.share) {
                            return navigator.share(data);
                        }

                        const a = document.createElement("a");
                        a.href = dataUrl;
                        a.download = file.name;
                        a.click();
                    })
                    .catch(function () {});
            }
        };
    }

    /* poems search + favorites filter */
    const grid = document.querySelector(".poems-grid");

    if (grid && pageName() === "poems.html") {
        const wrap = document.createElement("div");
        wrap.className = "mg-search-wrap";
        wrap.innerHTML =
            '<input class="mg-search" type="search" placeholder="Search poems…">' +
            '<div class="mg-tools">' +
            '<button type="button" class="mg-btn" id="mg-all">All</button>' +
            '<button type="button" class="mg-btn" id="mg-saved">★ Saved</button>' +
            "</div>" +
            '<p class="mg-empty" id="mg-empty">No poems match that.</p>';

        grid.parentNode.insertBefore(wrap, grid);

        const input = wrap.querySelector(".mg-search");
        const empty = wrap.querySelector("#mg-empty");
        let onlyFav = false;

        function filter() {
            const q = input.value.toLowerCase().trim();
            const saved = favs();
            let shown = 0;

            grid.querySelectorAll(".poem-card").forEach(function (card) {
                const href = (card.getAttribute("href") || "").split("/").pop();
                const text = card.textContent.toLowerCase();
                const okText = !q || text.indexOf(q) !== -1;
                const okFav = !onlyFav || saved.indexOf(href) !== -1;
                const show = okText && okFav;

                card.style.display = show ? "" : "none";
                if (show) shown += 1;
            });

            empty.style.display = shown ? "none" : "block";
        }

        input.addEventListener("input", filter);

        wrap.querySelector("#mg-all").addEventListener("click", function () {
            onlyFav = false;
            wrap.querySelector("#mg-all").classList.add("on");
            wrap.querySelector("#mg-saved").classList.remove("on");
            filter();
        });

        wrap.querySelector("#mg-saved").addEventListener("click", function () {
            onlyFav = true;
            wrap.querySelector("#mg-saved").classList.add("on");
            wrap.querySelector("#mg-all").classList.remove("on");
            filter();
        });

        wrap.querySelector("#mg-all").classList.add("on");
    }

    /* gallery lightbox */
    document.querySelectorAll(".gallery-img").forEach(function (img) {
        img.addEventListener("click", function () {
            let box = document.querySelector(".mg-lightbox");

            if (!box) {
                box = document.createElement("div");
                box.className = "mg-lightbox";
                box.innerHTML = "<img alt=''>";
                document.body.appendChild(box);

                box.addEventListener("click", function () {
                    box.classList.remove("show");
                });
            }

            box.querySelector("img").src = img.src;
            box.querySelector("img").alt = img.alt || "";
            box.classList.add("show");
        });
    });

    /* Ambient gold stars on interior pages, but never on individual poem pages or homepage */
    const hero = document.querySelector(".hero");
    if (!hero && !poem) {
        const starfield = document.createElement("div");
        starfield.className = "kamsi-starfield";
        starfield.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 24; i++) {
            const star = document.createElement("span");
            star.style.left = (4 + Math.random() * 92) + "%";
            star.style.top = (5 + Math.random() * 90) + "%";
            star.style.animationDelay = (Math.random() * 8) + "s";
            star.style.animationDuration = (7 + Math.random() * 5) + "s";
            starfield.appendChild(star);
        }
        document.body.prepend(starfield);
    }

    /* quotes page: click a card to copy */
    document.querySelectorAll(".quote-card, .quote-text").forEach(function (el) {
        el.style.cursor = "pointer";
        el.title = "Click to copy";

        el.addEventListener("click", function () {
            const textEl = el.classList.contains("quote-text")
                ? el
                : el.querySelector(".quote-text") || el;

            const t = textEl.textContent.trim();

            if (navigator.clipboard && t) {
                navigator.clipboard.writeText(t);
            }
        });
    });
})();
