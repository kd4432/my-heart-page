
const input = document.getElementById("message");
const button = document.querySelector("button");
const canvas = document.getElementById("heartCanvas");
const ctx = canvas.getContext("2d");

let particles = [];
let mode = "idle";
let timer = 0;
let lastTime = 0;
let animationStarted = false;

const PARTICLE_COUNT = 2500;
const TRAIL_LENGTH = 12;
const COLORS = [
    "#ff1744",
    "#ff4081",
    "#ff69a6",
    "#ff80ab",
    "#ffb6d0",
    "#ffffff"
];

let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// 创建一个缓存的柔和光点
function createGlowTexture() {
    const glow = document.createElement("canvas");
    glow.width = 64;
    glow.height = 64;

    const g = glow.getContext("2d");
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 30);

    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.15, "rgba(255,180,220,0.9)");
    gradient.addColorStop(0.4, "rgba(255,70,150,0.35)");
    gradient.addColorStop(1, "rgba(255,50,130,0)");

    g.fillStyle = gradient;
    g.fillRect(0, 0, 64, 64);

    return glow;
}

const glowTexture = createGlowTexture();

// 生成饱满的爱心粒子
function createHeart() {
    particles = [];

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.42;
    const scale = Math.min(window.innerWidth / 38, 12);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());

        const x = 16 * Math.pow(Math.sin(t), 3);

        const y =
            13 * Math.cos(t)
            - 5 * Math.cos(2 * t)
            - 2 * Math.cos(3 * t)
            - Math.cos(4 * t);

        const px = centerX + x * scale * r;
        const py = centerY - y * scale * r;

        particles.push({
            x: px,
            y: py,
            homeX: px,
            homeY: py,
            vx: 0,
            vy: 0,
            size: Math.random() * 2.5 + 1.8,
            alpha: Math.random() * 0.5 + 0.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            trail: []
        });
    }

    mode = "heart";
    timer = 0;
}

// 高性能绘制粒子
function drawParticles() {
    ctx.save();

    // 先绘制尾迹
    particles.forEach(p => {
        if (p.trail.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);

        for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }

        ctx.lineTo(p.x, p.y);

        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.38;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.stroke();
    });

    // 再绘制粒子本体，使用缓存光点
    particles.forEach(p => {
        const s = p.size * 5;

        ctx.globalAlpha = p.alpha;
        ctx.drawImage(
            glowTexture,
            p.x - s / 2,
            p.y - s / 2,
            s,
            s
        );
    });

    ctx.globalAlpha = 1;
    ctx.restore();
}

// 爱心爆发
function explodeHeart() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.42;

    particles.forEach(p => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;

        const angle = Math.atan2(dy, dx);
        const speed = 3 + Math.random() * 7;

        // 向外扩散，并加入轻微旋转感
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 2;

        p.vx += (Math.random() - 0.5) * 2;
        p.vy += (Math.random() - 0.5) * 2;

        p.alpha = 1;
        p.trail = [];
    });

    mode = "explosion";
    timer = 0;
}

// 动画主循环
function animate(timestamp) {
    const dt = lastTime
        ? Math.min((timestamp - lastTime) / 16.67, 2)
        : 1;

    lastTime = timestamp;

    ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
    );

    if (mode === "heart") {
        timer += dt;

        particles.forEach(p => {
            const pulse = 1 + Math.sin(timer * 0.06) * 0.018;

            p.x = window.innerWidth / 2
                + (p.homeX - window.innerWidth / 2) * pulse;

            p.y = window.innerHeight * 0.42
                + (p.homeY - window.innerHeight * 0.42) * pulse;
        });

        drawParticles();

        // 爱心停留约2秒后绽放
        if (timer > 120) {
            explodeHeart();
        }
    }

    else if (mode === "explosion") {
        timer += dt;

        particles.forEach(p => {
            // 记录运动轨迹
            p.trail.push({ x: p.x, y: p.y });

            if (p.trail.length > TRAIL_LENGTH) {
                p.trail.shift();
            }

            // 更新位置
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // 重力
            p.vy += 0.18 * dt;

            // 空气阻力
            p.vx *= Math.pow(0.995, dt);

            // 地面反弹
            const ground = window.innerHeight - 8;

            if (p.y > ground) {
                p.y = ground;

                if (Math.abs(p.vy) > 0.8) {
                    p.vy *= -0.35;
                    p.vx *= 0.75;
                } else {
                    p.vy = 0;
                    p.vx *= 0.9;
                }
            }

            // 慢慢消失
            p.alpha -= 0.0028 * dt;
        });

        drawParticles();

        if (timer > 650 || particles.every(p => p.alpha <= 0.02)) {
            particles = [];
            mode = "idle";
        }
    }

    if (mode !== "idle") {
        requestAnimationFrame(animate);
    } else {
        animationStarted = false;
    }
}

// 点击按钮
button.addEventListener("click", function () {
    const message = input.value.trim();

    if (message === "你好") {
        if (mode !== "idle") return;

        createHeart();

        if (!animationStarted) {
            animationStarted = true;
            lastTime = 0;
            requestAnimationFrame(animate);
        }
    } else {
        alert("请先输入：你好 ❤️");
    }
});

