// Text Scramble Class
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Particle Network (Existing) - Keep your existing Class code here
class ParticleNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.packets = [];
        this.maxParticles = 120; // Increased count for depth
        this.connectionDistance = 120;

        this.mouse = { x: null, y: null };

        this.resize = this.resize.bind(this);
        this.animate = this.animate.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        window.addEventListener('resize', this.resize);
        document.addEventListener('mousemove', this.handleMouseMove);

        this.resize();
        this.initParticles();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    initParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            // Assign Z-depth (0 = far away/background, 1 = close/foreground)
            const z = Math.random();

            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                z: z,
                // Speed depends on depth (Parallax: closer = faster)
                vx: (Math.random() - 0.5) * (0.2 + z * 0.8),
                vy: (Math.random() - 0.5) * (0.2 + z * 0.8),
                // Size depends on depth (Z-Zoom)
                baseSize: (0.5 + z * 1.5),
                size: (0.5 + z * 1.5),
                energy: 0,
                neighbors: []
            });
        }
    }

    fireNeuron() {
        if (Math.random() < 0.05) { // Increased firing rate
            const targetIndex = Math.floor(Math.random() * this.particles.length);
            const p = this.particles[targetIndex];
            p.energy = 1;

            if (p.neighbors.length > 0) {
                p.neighbors.forEach(neighbor => {
                    this.packets.push({
                        from: p,
                        to: neighbor,
                        curr: { x: p.x, y: p.y },
                        progress: 0,
                        speed: 0.02 + Math.random() * 0.03,
                        size: 2
                    });
                });
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Sort particles by Z-index so background draws first (painters algorithm)
        // Note: Sorting every frame is expensive, but fine for <200 particles
        this.particles.sort((a, b) => a.z - b.z);

        // Reset connectivity
        this.particles.forEach(p => p.neighbors = []);

        // 1. Update Particles with Z-Axis Zoom
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Slowly move towards camera (Z-Zoom)
            p.z += 0.0005;
            if (p.z > 1) {
                p.z = 0; // Reset to background
                // Randomize position on reset to avoid patterns
                p.x = Math.random() * this.canvas.width;
                p.y = Math.random() * this.canvas.height;
            }

            // Update size/speed based on new Z
            p.baseSize = 0.5 + p.z * 1.5;

            // Wall bounce (only for X/Y)
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            p.energy *= 0.96;
        });

        // 2. Draw Connections
        // We look for connections only between particles with similar Z-depths
        // to avoid "crossing lines" looking weird in 3D space
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];

            // Connect to mouse checks
            if (this.mouse.x != null) {
                const distM = Math.hypot(this.mouse.x - p1.x, this.mouse.y - p1.y);
                // Mouse interaction radius scales with Z (easier to touch foreground items)
                const interactionDist = (this.connectionDistance + 50) * (0.8 + p1.z);

                if (distM < interactionDist) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(168, 85, 247, ${(1 - distM / interactionDist) * p1.z})`; // Purple
                    this.ctx.lineWidth = 1 * p1.z; // Thickness based on Z
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();
                }
            }

            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];

                // Only connect if Z-depth is similar (within 0.2 range)
                // This creates "planes" of activity instead of a mess
                if (Math.abs(p1.z - p2.z) > 0.2) continue;

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.hypot(dx, dy);

                // Connection distance scales with Z (perspective)
                const maxDist = this.connectionDistance * (0.8 + p1.z);

                if (dist < maxDist) {
                    p1.neighbors.push(p2);
                    p2.neighbors.push(p1);

                    let alpha = 1 - dist / maxDist;
                    // Apply Focus Blur simulation: Background lines are fainter
                    alpha *= (0.2 + p1.z * 0.8);

                    const combinedEnergy = (p1.energy + p2.energy);
                    let width = (0.5 + combinedEnergy * 2) * (0.5 + p1.z); // Scale thickness by Z

                    // Draw Line (base)
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.2})`; // Violet base
                    this.ctx.lineWidth = 0.8;
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();

                    if (combinedEnergy > 0.1) {
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * combinedEnergy})`; // Purple
                        this.ctx.lineWidth = width;
                        this.ctx.moveTo(p1.x, p1.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                }
            }
        }

        // 3. Draw Particles (After lines to obscure connection points)
        this.particles.forEach(p => {
            this.ctx.beginPath();
            const drawSize = p.baseSize + p.energy * 2;
            this.ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);

            // Focus Blur using opacity
            // Background particles are more transparent
            const baseAlpha = 0.3 + p.z * 0.7;

            // Color interpolation: Deep Blue/Grey -> Neon Purple
            // Inactive (Energy 0): 100, 116, 139 (Slate-500)
            // Active (Energy 1): 192, 132, 252 (Purple-400)
            const r = 100 + (92 * p.energy);
            const g = 116 + (16 * p.energy);
            const b = 139 + (113 * p.energy);

            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha + p.energy})`;

            // "Blur" calculation - simulate depth of field
            // We can't actually blur each particle easily without performance hit,
            // so we use soft edges/alpha to simulate it.
            this.ctx.fill();

            if (p.energy > 0.5) {
                this.ctx.shadowBlur = 15 * p.z;
                this.ctx.shadowColor = "rgba(192, 132, 252, 1)"; // Purple Glow
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });

        // 4. Update and Draw Packets
        for (let i = this.packets.length - 1; i >= 0; i--) {
            const pkt = this.packets[i];
            pkt.progress += pkt.speed;

            if (pkt.progress >= 1) {
                pkt.to.energy = Math.min(1, pkt.to.energy + 0.3);
                this.packets.splice(i, 1);
                continue;
            }

            const cx = pkt.from.x + (pkt.to.x - pkt.from.x) * pkt.progress;
            const cy = pkt.from.y + (pkt.to.y - pkt.from.y) * pkt.progress;

            // Packet size scales with Z of the "from" particle
            const scale = 0.5 + pkt.from.z;

            this.ctx.beginPath();
            this.ctx.arc(cx, cy, pkt.size * scale, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + pkt.from.z * 0.5})`; // Purple packets
            this.ctx.fill();
        }

        this.fireNeuron();
        requestAnimationFrame(this.animate);
    }
}

// Initialization and Role Cycler
window.onload = () => {
    // 1. Start Background
    const particleCanvas = document.getElementById('particle-network');
    if (particleCanvas) {
        new ParticleNetwork(particleCanvas);
    }

    // 2. Start Text Scramble
    const el = document.getElementById('role-text');
    if (el) {
        const fx = new TextScramble(el);
        const phrases = [
            'AI ENGINEER',
            'ML DEVELOPER',
            'BACKEND EXPERT',
            'DATA SCIENTIST'
        ];

        let counter = 0;
        const next = () => {
            fx.setText(phrases[counter]).then(() => {
                setTimeout(next, 2000); // Wait 2s before next cycle
            });
            counter = (counter + 1) % phrases.length;
        };

        next();
    }

    // 3. Scroll Animation Logic
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-visible');
                observer.unobserve(entry.target); // Run once
            }
        });
    }, observerOptions);

    // Target elements to animate
    const animatedElements = document.querySelectorAll('.glass-card, .skill-card-outer, .project-card');
    animatedElements.forEach(el => {
        el.classList.add('scroll-hidden'); // Initialize hidden state
        observer.observe(el);
    });
};
