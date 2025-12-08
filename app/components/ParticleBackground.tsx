'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}

export default function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouseX = -1000;
        let mouseY = -1000;

        // 配置参数
        const PARTICLE_COUNT = 80;
        const CONNECT_DISTANCE = 150;
        const MOUSE_DISTANCE = 200;

        // 初始化 Canvas 尺寸
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        // 初始化粒子
        const initParticles = () => {
            particles = [];
            const colors = [
                (opacity: number) => `rgba(56, 136, 179, ${opacity})`,  // Gentle Blue
                (opacity: number) => `rgba(52, 168, 83, ${opacity})`,   // Fresh Green
                (opacity: number) => `rgba(255, 150, 150, ${opacity})`  // Soft Pink
            ];

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const colorFn = colors[Math.floor(Math.random() * colors.length)];
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 3 + 1,
                    color: colorFn(Math.random() * 0.4 + 0.1)
                });
            }
        };

        // 绘制逻辑
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 更新和绘制每个粒子
            particles.forEach((p, i) => {
                // 更新位置
                p.x += p.vx;
                p.y += p.vy;

                // 边界反弹
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // 鼠标互动（简单的排斥效果）
                const dx = mouseX - p.x;
                const dy = mouseY - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < MOUSE_DISTANCE) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (MOUSE_DISTANCE - distance) / MOUSE_DISTANCE;
                    const directionX = forceDirectionX * force * 0.5;
                    const directionY = forceDirectionY * force * 0.5;

                    p.vx -= directionX;
                    p.vy -= directionY;
                }

                // 绘制粒子
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // 绘制连线
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < CONNECT_DISTANCE) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(100, 116, 139, ${0.1 * (1 - dist / CONNECT_DISTANCE)})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        // 事件监听
        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);

        // 启动
        resizeCanvas();
        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none opacity-60"
        />
    );
}
