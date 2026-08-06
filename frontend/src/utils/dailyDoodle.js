// Generates a subtle, full-page background pattern that changes once per day.
// Deterministic on the date, so everyone sees the same "doodle of the day"
// without needing any network request or server support.

function dayIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / 86400000);
}

const PATTERNS = [
  // Topographic contour lines
  (color) => `
    <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
      <g fill='none' stroke='${color}' stroke-width='1'>
        <path d='M0,60 Q100,20 200,60 T400,60' />
        <path d='M0,120 Q100,80 200,120 T400,120' />
        <path d='M0,180 Q100,140 200,180 T400,180' />
        <path d='M0,240 Q100,200 200,240 T400,240' />
        <path d='M0,300 Q100,260 200,300 T400,300' />
        <path d='M0,360 Q100,320 200,360 T400,360' />
      </g>
    </svg>`,
  // Scattered dot grid
  (color) => {
    let dots = "";
    for (let x = 20; x < 400; x += 40) {
      for (let y = 20; y < 400; y += 40) {
        dots += `<circle cx='${x}' cy='${y}' r='2' fill='${color}' />`;
      }
    }
    return `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>${dots}</svg>`;
  },
  // Mountain range silhouette line
  (color) => `
    <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
      <g fill='none' stroke='${color}' stroke-width='1.5'>
        <path d='M0,300 L60,220 L110,270 L170,150 L230,260 L280,190 L340,280 L400,230' />
        <path d='M0,340 L50,290 L100,320 L160,240 L220,310 L270,260 L330,330 L400,290' />
      </g>
    </svg>`,
  // Gentle wave field
  (color) => `
    <svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'>
      <g fill='none' stroke='${color}' stroke-width='1'>
        <path d='M0,20 C50,0 50,40 100,20 C150,0 150,40 200,20 C250,0 250,40 300,20 C350,0 350,40 400,20' />
        <path d='M0,60 C50,40 50,80 100,60 C150,40 150,80 200,60 C250,40 250,80 300,60 C350,40 350,80 400,60' />
        <path d='M0,100 C50,80 50,120 100,100 C150,80 150,120 200,100 C250,80 250,120 300,100 C350,80 350,120 400,100' />
        <path d='M0,140 C50,120 50,160 100,140 C150,120 150,160 200,140 C250,120 250,160 300,140 C350,120 350,160 400,140' />
        <path d='M0,180 C50,160 50,200 100,180 C150,160 150,200 200,180 C250,160 250,200 300,180 C350,160 350,200 400,180' />
      </g>
    </svg>`,
  // Scattered leaf/branch marks
  (color) => `
    <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
      <g fill='none' stroke='${color}' stroke-width='1.3'>
        <path d='M40,40 Q60,20 80,40 Q60,60 40,40' />
        <path d='M160,90 Q180,70 200,90 Q180,110 160,90' />
        <path d='M300,50 Q320,30 340,50 Q320,70 300,50' />
        <path d='M90,220 Q110,200 130,220 Q110,240 90,220' />
        <path d='M260,260 Q280,240 300,260 Q280,280 260,260' />
        <path d='M40,340 Q60,320 80,340 Q60,360 40,340' />
        <path d='M340,340 Q360,320 380,340 Q360,360 340,340' />
      </g>
    </svg>`,
];

export function getDailyDoodleDataUri(colorHex) {
  const pattern = PATTERNS[dayIndex() % PATTERNS.length](colorHex);
  const encoded = encodeURIComponent(pattern.replace(/\s+/g, " ").trim());
  return `url("data:image/svg+xml,${encoded}")`;
}
