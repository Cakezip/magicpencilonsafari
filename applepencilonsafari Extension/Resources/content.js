(() => {
    if (window.top !== window) {
        return;
    }

    const SETTINGS_KEY = "magicPencilSettings";
    const DEFAULT_SETTINGS = Object.freeze({
        persistence: "volatile",
        enabled: true,
        ttlMs: 30000,
        fadeMs: 1400,
        strokeWidth: 3.2,
        color: "#111111"
    });
    const OVERLAY_ID = "magic-pencil-overlay";
    const BADGE_ID = "magic-pencil-badge";
    const DEFAULT_BADGE_MESSAGE = "Pencil draws. Fingers scroll.";
    const MAX_Z_INDEX = "2147483647";
    const TERMINAL_POINT_MAX_DISTANCE = 120;

    const state = {
        activePointerId: null,
        activeStylusTouchIds: new Set(),
        activeStroke: null,
        badgeTimeoutId: 0,
        canvas: null,
        context: null,
        expiryTimerId: 0,
        frameHandle: 0,
        isRestoringScroll: false,
        overlay: null,
        scrollLock: null,
        settings: { ...DEFAULT_SETTINGS },
        strokes: [],
        viewportHeight: 0,
        viewportWidth: 0,
        viewportScale: 0
    };

    function createOverlay() {
        if (state.overlay) {
            return;
        }

        const overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            pointerEvents: "none",
            zIndex: MAX_Z_INDEX,
            overflow: "hidden"
        });

        const canvas = document.createElement("canvas");
        Object.assign(canvas.style, {
            display: "block",
            width: "100%",
            height: "100%"
        });

        const badge = document.createElement("div");
        badge.id = BADGE_ID;
        badge.textContent = DEFAULT_BADGE_MESSAGE;
        Object.assign(badge.style, {
            position: "absolute",
            right: "16px",
            bottom: "16px",
            padding: "8px 12px",
            borderRadius: "999px",
            background: "rgba(17, 17, 17, 0.82)",
            color: "#ffffff",
            fontFamily: '"SF Pro Text", ui-rounded, system-ui, sans-serif',
            fontSize: "12px",
            lineHeight: "1.2",
            letterSpacing: "0.01em",
            opacity: "0",
            transform: "translateY(6px)",
            transition: "opacity 180ms ease, transform 180ms ease"
        });

        overlay.append(canvas, badge);
        document.documentElement.appendChild(overlay);

        state.overlay = overlay;
        state.canvas = canvas;
        state.context = canvas.getContext("2d");

        resizeCanvas(true);
        syncOverlayVisibility();
    }

    function syncOverlayVisibility() {
        createOverlay();

        if (!state.overlay) {
            return;
        }

        state.overlay.style.display = state.settings.enabled ? "block" : "none";
    }

    function flashBadge(message) {
        const badge = document.getElementById(BADGE_ID);
        if (!badge) {
            return;
        }

        badge.textContent = message || DEFAULT_BADGE_MESSAGE;

        badge.style.opacity = "1";
        badge.style.transform = "translateY(0)";

        window.clearTimeout(state.badgeTimeoutId);
        state.badgeTimeoutId = window.setTimeout(() => {
            badge.style.opacity = "0";
            badge.style.transform = "translateY(6px)";
        }, 1800);
    }

    function resizeCanvas(force = false) {
        createOverlay();

        if (!state.canvas || !state.context) {
            return false;
        }

        const width = Math.max(1, Math.round(window.innerWidth));
        const height = Math.max(1, Math.round(window.innerHeight));
        const scale = window.devicePixelRatio || 1;

        if (!force &&
            width === state.viewportWidth &&
            height === state.viewportHeight &&
            scale === state.viewportScale) {
            return false;
        }

        state.viewportWidth = width;
        state.viewportHeight = height;
        state.viewportScale = scale;

        state.canvas.width = Math.max(1, Math.round(width * scale));
        state.canvas.height = Math.max(1, Math.round(height * scale));
        state.canvas.style.width = `${width}px`;
        state.canvas.style.height = `${height}px`;

        state.context.setTransform(scale, 0, 0, scale, 0, 0);
        state.context.lineCap = "round";
        state.context.lineJoin = "round";
        state.context.imageSmoothingEnabled = true;

        return true;
    }

    function clearCanvas() {
        if (!state.context || !state.canvas) {
            return;
        }

        state.context.setTransform(1, 0, 0, 1, 0, 0);
        state.context.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.context.setTransform(state.viewportScale || 1, 0, 0, state.viewportScale || 1, 0, 0);
    }

    function requestRender() {
        if (state.frameHandle) {
            return;
        }

        state.frameHandle = window.requestAnimationFrame(renderFrame);
    }

    function clearExpiryTimer() {
        window.clearTimeout(state.expiryTimerId);
        state.expiryTimerId = 0;
    }

    function isVolatileStroke(stroke) {
        return stroke.persistence !== "session";
    }

    function scheduleFollowUpRender(now) {
        clearExpiryTimer();

        if (!state.settings.enabled) {
            return;
        }

        let needsAnimationFrame = false;
        let nextRenderAt = Number.POSITIVE_INFINITY;

        for (const stroke of state.strokes) {
            if (stroke === state.activeStroke) {
                needsAnimationFrame = true;
                continue;
            }

            if (!isVolatileStroke(stroke)) {
                continue;
            }

            const age = now - stroke.updatedAt;

            if (age < state.settings.ttlMs) {
                nextRenderAt = Math.min(nextRenderAt, stroke.updatedAt + state.settings.ttlMs);
                continue;
            }

            if (age < state.settings.ttlMs + state.settings.fadeMs) {
                needsAnimationFrame = true;
            }
        }

        if (needsAnimationFrame) {
            state.expiryTimerId = window.setTimeout(() => {
                state.expiryTimerId = 0;
                requestRender();
            }, 16);
            return;
        }

        if (Number.isFinite(nextRenderAt)) {
            const delay = Math.max(16, nextRenderAt - now);
            state.expiryTimerId = window.setTimeout(() => {
                state.expiryTimerId = 0;
                requestRender();
            }, delay);
        }
    }

    function renderFrame() {
        state.frameHandle = 0;
        resizeCanvas();
        clearCanvas();

        if (!state.settings.enabled || !state.context) {
            return;
        }

        const now = Date.now();
        const expirationWindow = state.settings.ttlMs + state.settings.fadeMs;

        state.strokes = state.strokes.filter((stroke) => {
            if (stroke === state.activeStroke) {
                return true;
            }

            if (!isVolatileStroke(stroke)) {
                return true;
            }

            return now - stroke.updatedAt < expirationWindow;
        });

        for (const stroke of state.strokes) {
            const opacity = stroke === state.activeStroke || !isVolatileStroke(stroke) ? 1 : strokeOpacity(stroke, now);
            if (opacity <= 0) {
                continue;
            }

            drawStroke(stroke, opacity);
        }

        scheduleFollowUpRender(now);
    }

    function strokeOpacity(stroke, now) {
        const age = now - stroke.updatedAt;

        if (age <= state.settings.ttlMs) {
            return 1;
        }

        const fadeAge = age - state.settings.ttlMs;
        return Math.max(0, 1 - (fadeAge / state.settings.fadeMs));
    }

    function widthForPoint(stroke, point) {
        const pressure = typeof point.pressure === "number" && point.pressure > 0 ? point.pressure : 0.5;
        return stroke.baseWidth * (0.8 + (pressure * 0.8));
    }

    function drawStroke(stroke, opacity) {
        if (!state.context || stroke.points.length === 0) {
            return;
        }

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const context = state.context;

        context.save();
        context.globalAlpha = opacity;
        context.strokeStyle = stroke.color;
        context.fillStyle = stroke.color;

        if (stroke.points.length === 1) {
            const point = stroke.points[0];
            const radius = widthForPoint(stroke, point) / 2;

            context.beginPath();
            context.arc(point.x - scrollX, point.y - scrollY, radius, 0, Math.PI * 2);
            context.fill();
            context.restore();
            return;
        }

        for (let index = 1; index < stroke.points.length; index += 1) {
            const previousPoint = stroke.points[index - 1];
            const currentPoint = stroke.points[index];

            context.beginPath();
            context.lineWidth = (widthForPoint(stroke, previousPoint) + widthForPoint(stroke, currentPoint)) / 2;
            context.moveTo(previousPoint.x - scrollX, previousPoint.y - scrollY);
            context.lineTo(currentPoint.x - scrollX, currentPoint.y - scrollY);
            context.stroke();
        }

        context.restore();
    }

    function isPenEvent(event) {
        return event.pointerType === "pen";
    }

    function pointFromEvent(event) {
        return {
            pressure: typeof event.pressure === "number" && event.pressure > 0 ? event.pressure : 0.5,
            x: event.clientX + window.scrollX,
            y: event.clientY + window.scrollY
        };
    }

    function appendCoalescedPoints(stroke, event) {
        const coalescedEvents = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];

        if (!coalescedEvents.length) {
            appendPoint(stroke, event);
            return;
        }

        for (const coalescedEvent of coalescedEvents) {
            appendPoint(stroke, coalescedEvent);
        }
    }

    function createStroke(event) {
        return {
            baseWidth: state.settings.strokeWidth,
            color: state.settings.color,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            persistence: state.settings.persistence,
            points: [pointFromEvent(event)],
            updatedAt: Date.now()
        };
    }

    function appendPoint(stroke, event) {
        const nextPoint = pointFromEvent(event);
        appendKnownPoint(stroke, nextPoint);
    }

    function appendKnownPoint(stroke, nextPoint) {
        const lastPoint = stroke.points[stroke.points.length - 1];

        if (lastPoint) {
            const dx = nextPoint.x - lastPoint.x;
            const dy = nextPoint.y - lastPoint.y;

            if (Math.hypot(dx, dy) < 0.7) {
                stroke.updatedAt = Date.now();
                return;
            }
        }

        stroke.points.push(nextPoint);
        stroke.updatedAt = Date.now();
    }

    function hasUsableViewportPoint(event) {
        return Number.isFinite(event.clientX) &&
            Number.isFinite(event.clientY) &&
            event.clientX >= -1 &&
            event.clientY >= -1 &&
            event.clientX <= window.innerWidth + 1 &&
            event.clientY <= window.innerHeight + 1;
    }

    function appendTerminalPointIfValid(stroke, event) {
        if (!hasUsableViewportPoint(event)) {
            stroke.updatedAt = Date.now();
            return;
        }

        const terminalPoint = pointFromEvent(event);
        const lastPoint = stroke.points[stroke.points.length - 1];

        if (lastPoint) {
            const dx = terminalPoint.x - lastPoint.x;
            const dy = terminalPoint.y - lastPoint.y;

            if (Math.hypot(dx, dy) > TERMINAL_POINT_MAX_DISTANCE) {
                stroke.updatedAt = Date.now();
                return;
            }
        }

        appendKnownPoint(stroke, terminalPoint);
    }

    function consumePenEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
        }
    }

    function isStylusTouch(touch) {
        return touch?.touchType === "stylus";
    }

    function getTouchesFromEvent(event) {
        return Array.from(event.changedTouches || []);
    }

    function getTrackedStylusTouches(event) {
        return getTouchesFromEvent(event).filter((touch) => state.activeStylusTouchIds.has(touch.identifier));
    }

    function getStylusTouches(event) {
        return getTouchesFromEvent(event).filter(isStylusTouch);
    }

    function lockScroll() {
        if (state.scrollLock) {
            return;
        }

        const root = document.documentElement;
        const body = document.body;

        state.scrollLock = {
            bodyOverscrollBehavior: body?.style.overscrollBehavior ?? "",
            bodyTouchAction: body?.style.touchAction ?? "",
            bodyWebkitUserSelect: body?.style.webkitUserSelect ?? "",
            x: window.scrollX,
            y: window.scrollY,
            rootOverscrollBehavior: root.style.overscrollBehavior,
            rootTouchAction: root.style.touchAction,
            rootWebkitUserSelect: root.style.webkitUserSelect
        };

        root.style.overscrollBehavior = "none";
        root.style.touchAction = "none";
        root.style.webkitUserSelect = "none";

        if (body) {
            body.style.overscrollBehavior = "none";
            body.style.touchAction = "none";
            body.style.webkitUserSelect = "none";
        }
    }

    function unlockScroll() {
        if (!state.scrollLock) {
            return;
        }

        const root = document.documentElement;
        const body = document.body;
        const {
            bodyOverscrollBehavior,
            bodyTouchAction,
            bodyWebkitUserSelect,
            rootOverscrollBehavior,
            rootTouchAction,
            rootWebkitUserSelect
        } = state.scrollLock;

        root.style.overscrollBehavior = rootOverscrollBehavior;
        root.style.touchAction = rootTouchAction;
        root.style.webkitUserSelect = rootWebkitUserSelect;

        if (body) {
            body.style.overscrollBehavior = bodyOverscrollBehavior;
            body.style.touchAction = bodyTouchAction;
            body.style.webkitUserSelect = bodyWebkitUserSelect;
        }

        state.scrollLock = null;
        state.isRestoringScroll = false;
    }

    function releaseScrollLockIfIdle() {
        if (state.activePointerId === null && state.activeStylusTouchIds.size === 0) {
            unlockScroll();
        }
    }

    function enforceScrollLock() {
        if (!state.scrollLock) {
            return false;
        }

        if (state.isRestoringScroll) {
            state.isRestoringScroll = false;
            return true;
        }

        if (window.scrollX !== state.scrollLock.x || window.scrollY !== state.scrollLock.y) {
            state.isRestoringScroll = true;
            window.scrollTo(state.scrollLock.x, state.scrollLock.y);
            return true;
        }

        return false;
    }

    function capturePointer(pointerId) {
        try {
            document.documentElement.setPointerCapture(pointerId);
        } catch (error) {
            // Some pages or Safari builds may refuse capture; drawing can continue without it.
        }
    }

    function releasePointer(pointerId) {
        try {
            document.documentElement.releasePointerCapture(pointerId);
        } catch (error) {
            // Matching release failures are harmless for our overlay.
        }
    }

    function clearStrokes() {
        if (state.activePointerId !== null) {
            releasePointer(state.activePointerId);
        }

        state.activePointerId = null;
        state.activeStylusTouchIds.clear();
        state.activeStroke = null;
        state.strokes = [];
        clearExpiryTimer();
        unlockScroll();
        clearCanvas();
    }

    function handlePointerDown(event) {
        if (!state.settings.enabled || !isPenEvent(event) || state.activePointerId !== null) {
            return;
        }

        consumePenEvent(event);
        lockScroll();

        state.activePointerId = event.pointerId;
        state.activeStroke = createStroke(event);
        state.strokes.push(state.activeStroke);

        capturePointer(event.pointerId);
        flashBadge();
        requestRender();
    }

    function handlePointerMove(event) {
        if (!state.settings.enabled || !isPenEvent(event) || event.pointerId !== state.activePointerId || !state.activeStroke) {
            return;
        }

        consumePenEvent(event);
        appendCoalescedPoints(state.activeStroke, event);
        requestRender();
    }

    function finishStroke(event) {
        if (!isPenEvent(event) || event.pointerId !== state.activePointerId || !state.activeStroke) {
            return;
        }

        consumePenEvent(event);

        if (event.type === "pointerup") {
            appendTerminalPointIfValid(state.activeStroke, event);
        } else {
            state.activeStroke.updatedAt = Date.now();
        }
        state.activePointerId = null;
        state.activeStroke = null;
        releasePointer(event.pointerId);
        releaseScrollLockIfIdle();
        requestRender();
    }

    function handleTouchStart(event) {
        if (!state.settings.enabled) {
            return;
        }

        const stylusTouches = getStylusTouches(event);
        if (stylusTouches.length === 0) {
            return;
        }

        for (const touch of stylusTouches) {
            state.activeStylusTouchIds.add(touch.identifier);
        }

        lockScroll();
        consumePenEvent(event);
    }

    function handleTouchMove(event) {
        if (!state.settings.enabled) {
            return;
        }

        const stylusTouches = getTrackedStylusTouches(event);
        if (stylusTouches.length === 0) {
            return;
        }

        lockScroll();
        consumePenEvent(event);
    }

    function finishTouchInput(event) {
        const stylusTouches = getTrackedStylusTouches(event);
        if (stylusTouches.length === 0) {
            return;
        }

        for (const touch of stylusTouches) {
            state.activeStylusTouchIds.delete(touch.identifier);
        }

        consumePenEvent(event);
        releaseScrollLockIfIdle();
    }

    async function loadSettings() {
        try {
            const stored = await browser.storage.local.get(SETTINGS_KEY);
            const nextSettings = stored?.[SETTINGS_KEY] ?? {};
            state.settings = { ...DEFAULT_SETTINGS, ...nextSettings };
        } catch (error) {
            state.settings = { ...DEFAULT_SETTINGS };
        }

        syncOverlayVisibility();
    }

    function handleSettingsChange(nextSettings) {
        const wasEnabled = state.settings.enabled;
        const previousPersistence = state.settings.persistence;
        const changedAt = Date.now();
        state.settings = { ...DEFAULT_SETTINGS, ...nextSettings };
        syncOverlayVisibility();

        if (previousPersistence !== state.settings.persistence) {
            for (const stroke of state.strokes) {
                stroke.persistence = state.settings.persistence;

                if (state.settings.persistence === "volatile") {
                    stroke.updatedAt = changedAt;
                }
            }
        }

        if (!state.settings.enabled) {
            clearStrokes();
        } else {
            requestRender();
        }

        if (wasEnabled !== state.settings.enabled) {
            flashBadge(state.settings.enabled ? "Magic Pencil is on." : "Magic Pencil is off.");
            return;
        }

        if (previousPersistence !== state.settings.persistence) {
            flashBadge(state.settings.persistence === "session" ? "Session ink stays until page exit." : "Volatile ink fades automatically.");
        }
    }

    function attachListeners() {
        window.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: false });
        window.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });
        window.addEventListener("pointerup", finishStroke, { capture: true, passive: false });
        window.addEventListener("pointercancel", finishStroke, { capture: true, passive: false });
        window.addEventListener("touchstart", handleTouchStart, { capture: true, passive: false });
        window.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });
        window.addEventListener("touchend", finishTouchInput, { capture: true, passive: false });
        window.addEventListener("touchcancel", finishTouchInput, { capture: true, passive: false });
        window.addEventListener("scroll", () => {
            if (enforceScrollLock()) {
                return;
            }

            requestRender();
        }, { passive: true });
        window.addEventListener("resize", requestRender, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", requestRender, { passive: true });
            window.visualViewport.addEventListener("scroll", requestRender, { passive: true });
        }

        browser.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "local" || !changes[SETTINGS_KEY]) {
                return;
            }

            handleSettingsChange(changes[SETTINGS_KEY].newValue ?? {});
        });

        browser.runtime.onMessage.addListener((message) => {
            if (!message || typeof message !== "object") {
                return undefined;
            }

            if (message.type === "magic-pencil:clear") {
                clearStrokes();
                flashBadge("This page was cleared.");
                return Promise.resolve({ ok: true });
            }

            if (message.type === "magic-pencil:ping") {
                return Promise.resolve({
                    activeStrokeCount: state.strokes.length,
                    enabled: state.settings.enabled,
                    persistence: state.settings.persistence,
                    ok: true
                });
            }

            return undefined;
        });
    }

    async function bootstrap() {
        createOverlay();
        attachListeners();
        await loadSettings();
        requestRender();
    }

    bootstrap();
})();
