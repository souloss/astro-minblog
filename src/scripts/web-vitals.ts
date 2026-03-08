type WebVitalMetric = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
};

function getRating(name: string, value: number): WebVitalMetric["rating"] {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FID: [100, 300],
    INP: [200, 500],
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name] ?? [0, 0];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function reportMetric(metric: WebVitalMetric) {
  if (import.meta.env.DEV) {
    const color =
      metric.rating === "good"
        ? "#0cce6b"
        : metric.rating === "needs-improvement"
          ? "#ffa400"
          : "#ff4e42";
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }
}

function observeWebVitals() {
  if (typeof PerformanceObserver === "undefined") return;

  const id = `v${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        reportMetric({
          name: "LCP",
          value: last.startTime,
          rating: getRating("LCP", last.startTime),
          id,
        });
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    const fcpObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          reportMetric({
            name: "FCP",
            value: entry.startTime,
            rating: getRating("FCP", entry.startTime),
            id,
          });
        }
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });

    const clsObserver = new PerformanceObserver(list => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (
          !(entry as PerformanceEntry & { hadRecentInput?: boolean })
            .hadRecentInput
        ) {
          clsValue += (entry as PerformanceEntry & { value: number }).value;
        }
      }
      reportMetric({
        name: "CLS",
        value: clsValue,
        rating: getRating("CLS", clsValue),
        id,
      });
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // PerformanceObserver types not supported in this browser
  }
}

observeWebVitals();
