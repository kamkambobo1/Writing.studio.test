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

    /* KAMSI background music: shared player on every page.
       Autoplay is attempted by default, but browsers may require a visitor gesture. */
    (function initKamsiMusic() {
        const MUSIC_SRC = "mixkit-relax-beat-292.mp3";
        const ON_KEY = "kamsi-music-enabled";
        const AUTO_KEY = "kamsi-music-autoplay";
        const VOL_KEY = "kamsi-music-volume";
        const TIME_KEY = "kamsi-music-time";
        const page = pageName();
        const isPoemPage = /^poem-.+\.html$/i.test(page);

        // Future poem-specific tracks can be assigned here when those audio files exist.
        // Until then, all pages use the supplied signature track.
        const POEM_TRACKS = {
            // "poem-the-uncertainty-within.html": "assets/audio/uncertainty.mp3"
        };
        const audioSrc = (isPoemPage && POEM_TRACKS[page]) || MUSIC_SRC;

        const audio = document.createElement("audio");
        audio.id = "kamsi-background-audio";
        audio.preload = "metadata";
        audio.loop = true;
        audio.src = audioSrc;
        audio.setAttribute("aria-label", "KAMSI background music");
        audio.volume = 0.12;
        document.body.appendChild(audio);

        let enabled = localStorage.getItem(ON_KEY) !== "false";
        let autoplay = localStorage.getItem(AUTO_KEY) !== "false";
        let storedVolume = Number(localStorage.getItem(VOL_KEY));
        if (Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1) {
            audio.volume = storedVolume;
        }

        const panel = document.createElement("section");
        panel.className = "kamsi-music is-collapsed";
        panel.setAttribute("aria-label", "Background music controls");
        panel.innerHTML = `
            <div class="kamsi-music-main">
                <span class="kamsi-music-icon" aria-hidden="true">♫</span>
                <div class="kamsi-music-copy">
                    <strong>Background Music</strong>
                    <small>Soft music, kept low. Adjust the volume anytime here.</small>
                </div>
                <button type="button" class="kamsi-music-toggle" aria-pressed="false">ON</button>
                <button type="button" class="kamsi-music-close" aria-label="Close music settings" title="Close music settings">×</button>
            </div>
            <div class="kamsi-music-settings" hidden>
                <label class="kamsi-volume-label" for="kamsi-volume">Volume <span class="kamsi-volume-value">12%</span></label>
                <input id="kamsi-volume" type="range" min="0" max="30" step="1" value="12" aria-label="Music volume">
                <label class="kamsi-autoplay-label"><input type="checkbox" class="kamsi-autoplay" checked> Try to play automatically on visits</label>
                <p class="kamsi-music-note">Some browsers require you to press ON before sound can start.</p>
            </div>`;
        document.body.appendChild(panel);

        const toggle = panel.querySelector(".kamsi-music-toggle");
        const settings = panel.querySelector(".kamsi-music-settings");
        const volume = panel.querySelector("#kamsi-volume");
        const volumeValue = panel.querySelector(".kamsi-volume-value");
        const autoplayInput = panel.querySelector(".kamsi-autoplay");
        volume.value = Math.round(audio.volume * 100);
        volumeValue.textContent = volume.value + "%";
        autoplayInput.checked = autoplay;

        function updateToggle() {
            toggle.textContent = enabled ? "ON" : "OFF";
            toggle.classList.toggle("is-on", enabled);
            toggle.setAttribute("aria-pressed", String(enabled));
            toggle.setAttribute("aria-label", enabled ? "Turn background music off" : "Turn background music on");
        }
        updateToggle();

        // Carry playback position across ordinary page navigations where possible.
        audio.addEventListener("loadedmetadata", function () {
            const savedPage = sessionStorage.getItem("kamsi-music-page");
            const savedTime = Number(sessionStorage.getItem(TIME_KEY));
            if (savedPage && Number.isFinite(savedTime) && savedTime > 0 && audio.duration && savedTime < audio.duration - 1) {
                try { audio.currentTime = savedTime; } catch (_) {}
            }
            sessionStorage.setItem("kamsi-music-page", page);
            if (enabled && autoplay) {
                audio.play().catch(function () {
                    toggle.title = "Tap ON to start music; autoplay may be blocked by your browser.";
                });
            }
        }, { once: true });
        audio.addEventListener("timeupdate", function () {
            if (!audio.paused && Number.isFinite(audio.currentTime)) sessionStorage.setItem(TIME_KEY, String(audio.currentTime));
        });
        audio.addEventListener("play", function () {
            enabled = true;
            updateToggle();
            localStorage.setItem(ON_KEY, "true");
        });
        audio.addEventListener("pause", function () {
            if (audio.ended) return;
            updateToggle();
        });

        toggle.addEventListener("click", function () {
            if (enabled && !audio.paused) {
                enabled = false;
                audio.pause();
            } else {
                enabled = true;
                audio.play().then(function () {
                    panel.querySelector(".kamsi-music-note").textContent = "Soft music, kept low. Adjust the volume anytime here.";
                }).catch(function () {
                    enabled = false;
                    localStorage.setItem(ON_KEY, "false");
                    updateToggle();
                    panel.querySelector(".kamsi-music-note").textContent = "Your browser blocked playback. Tap ON again after interacting with the page.";
                });
            }
            localStorage.setItem(ON_KEY, String(enabled));
            updateToggle();
        });
        const iconButton = panel.querySelector(".kamsi-music-icon");
        const closeButton = panel.querySelector(".kamsi-music-close");
        closeButton.addEventListener("click", function () {
            panel.classList.add("is-collapsed");
            settings.hidden = true;
            iconButton.setAttribute("aria-label", "Show music settings");
        });
        iconButton.setAttribute("role", "button");
        iconButton.setAttribute("tabindex", "0");
        iconButton.setAttribute("aria-label", "Show or hide music settings");
        function toggleSettings() {
            const willExpand = panel.classList.contains("is-collapsed");
            panel.classList.toggle("is-collapsed", !willExpand);
            settings.hidden = !willExpand;
            iconButton.setAttribute("aria-label", willExpand ? "Hide music settings" : "Show music settings");
        }
        iconButton.addEventListener("click", toggleSettings);
        iconButton.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleSettings(); }
        });
        volume.addEventListener("input", function () {
            audio.volume = Number(volume.value) / 100;
            volumeValue.textContent = volume.value + "%";
            localStorage.setItem(VOL_KEY, String(audio.volume));
        });
        autoplayInput.addEventListener("change", function () {
            autoplay = autoplayInput.checked;
            localStorage.setItem(AUTO_KEY, String(autoplay));
            if (!autoplay && !audio.paused) {
                // Manual mode means the visitor controls starting playback; it doesn't abruptly stop current audio.
            } else if (autoplay && enabled && audio.paused) {
                audio.play().catch(function () {});
            }
        });

        // Save the last position just before a reader navigates to another local page.
        document.addEventListener("click", function (event) {
            const link = event.target.closest && event.target.closest("a[href]");
            if (!link || !link.href || new URL(link.href, location.href).origin !== location.origin) return;
            if (!/\.html(?:$|#|\?)/i.test(link.href)) return;
            if (Number.isFinite(audio.currentTime)) sessionStorage.setItem(TIME_KEY, String(audio.currentTime));
        });
    })();

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

        function showFavToast(message) {
            let toast = document.querySelector(".kamsi-fav-toast");
            if (!toast) {
                toast = document.createElement("div");
                toast.className = "kamsi-fav-toast";
                toast.setAttribute("role", "status");
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.classList.add("show");
            clearTimeout(toast._hide);
            toast._hide = setTimeout(function () {
                toast.classList.remove("show");
            }, 2500);
        }

        favBtn.addEventListener("click", function () {
            const list = favs();
            const i = list.indexOf(file);
            let message;

            if (i === -1) {
                list.push(file);
                message = "Saved — see them on All Poems";
            } else {
                list.splice(i, 1);
                message = "Removed from saved";
            }

            saveFavs(list);
            paintFav();
            showFavToast(message);
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
                }, 2500);
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

    if (grid && (pageName() === "poems.html" || pageName() === "poems")) {
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

        const savedBtn = wrap.querySelector("#mg-saved");
        const allBtn = wrap.querySelector("#mg-all");

        function updateSavedCount() {
            const count = favs().length;
            savedBtn.textContent = count ? "★ Saved (" + count + ")" : "★ Saved";
        }

        allBtn.addEventListener("click", function () {
            onlyFav = false;
            allBtn.classList.add("on");
            savedBtn.classList.remove("on");
            filter();
        });

        savedBtn.addEventListener("click", function () {
            onlyFav = true;
            savedBtn.classList.add("on");
            allBtn.classList.remove("on");
            filter();
        });

        allBtn.classList.add("on");
        updateSavedCount();
        filter();
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

    /* Ambient silver sparkles on all pages (including homepage) */
    const poemPageForStars = /^poem-.+\.html$/i.test(pageName()) || Boolean(poem);
    const starfield = document.createElement("div");
    starfield.className = "kamsi-starfield" + (poemPageForStars ? " is-poem" : "");
    starfield.setAttribute("aria-hidden", "true");
    const starCount = poemPageForStars ? 34 : 48;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement("span");
        star.style.left = (3 + Math.random() * 94) + "%";
        star.style.top = (5 + Math.random() * 90) + "%";
        star.style.animationDelay = (Math.random() * 5) + "s";
        star.style.animationDuration = (4 + Math.random() * 3) + "s";
        starfield.appendChild(star);
    }
    document.body.prepend(starfield);

    
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
