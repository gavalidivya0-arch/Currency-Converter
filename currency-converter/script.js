// Ensure Chart.js is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Line Chart (Statistics) ---
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    
    new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'USD',
                    data: [260, 270, 230, 420, 650, 600, 520, 750, 650, 700, 800, 820],
                    borderColor: '#1e1e78', // Dark Blue to match mockup
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4, // smooth curves
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'EURO',
                    data: [300, 310, 280, 250, 400, 260, 380, 550, 500, 750, 850, 860],
                    borderColor: '#ef4444', // Red
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4, // smooth curves
                    pointRadius: 0, // hide dots
                    pointHoverRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We built our own custom legend in HTML
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: 'Inter',
                            weight: '600'
                        },
                        color: '#8b8b9b'
                    }
                },
                y: {
                    min: 100,
                    max: 1000,
                    ticks: {
                        stepSize: 100,
                        font: {
                            size: 9,
                            family: 'Inter',
                            weight: '600'
                        },
                        color: '#8b8b9b'
                    },
                    grid: {
                        color: '#f0f0f0',
                        drawBorder: false,
                    }
                }
            }
        },
        plugins: [{
            id: 'x-axis-title',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 11px Inter';
                ctx.fillStyle = '#1e1e78';
                ctx.textAlign = 'right';
                ctx.fillText('Months', chart.width, chart.height - 5);
                ctx.restore();
            }
        }, {
             id: 'y-axis-title',
             afterDraw: (chart) => {
                 const ctx = chart.ctx;
                 ctx.save();
                 ctx.font = 'bold 11px Inter';
                 ctx.fillStyle = '#1e1e78';
                 ctx.textAlign = 'left';
                 ctx.fillText('Rate', 0, 15);
                 ctx.restore();
             }
        }]
    });

    // --- Donut Chart (Balance Details) ---
    const donutCtx = document.getElementById('donutChart').getContext('2d');
    
    new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['USD', 'Euro', 'Pounds', 'Naira'],
            datasets: [{
                data: [45, 30, 20, 5], 
                backgroundColor: [
                    '#2a2a72', // Dark Blue
                    '#0052cc', // Blue
                    '#5c2e91', // Purple
                    '#d1d5db'  // Gray
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // thickness of the donut ring
            plugins: {
                legend: {
                    display: false // custom legend in HTML
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
});
