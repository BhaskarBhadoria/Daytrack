import { useEffect, useState } from "react";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// NASA's Astronomy Picture of the Day — a genuinely daily-changing image feed,
// no account needed (DEMO_KEY has a modest shared rate limit, so we cache the
// result in localStorage for the day to avoid hitting it more than once).
export function useDailyPhoto() {
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    const cacheKey = `daytrack_apod_${todayStr()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setPhoto(JSON.parse(cached));
      return;
    }

    fetch("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.media_type !== "image") return; // some days APOD is a video
        const result = { url: data.url, title: data.title };
        localStorage.setItem(cacheKey, JSON.stringify(result));
        setPhoto(result);
      })
      .catch(() => {
        // Silently fall back to no photo — the doodle pattern still renders.
      });
  }, []);

  return photo;
}
