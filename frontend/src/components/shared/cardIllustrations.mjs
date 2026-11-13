const serviceImages = {
  LayoutTemplate: "service-responsive.svg",
  Bug: "service-optimization.svg",
  Workflow: "service-fullstack.svg",
  Globe2: "service-languages.svg",
  MessageSquare: "service-form.svg",
};

const problemImages = {
  Cpu: "problem-performance.svg",
  LayoutTemplate: serviceImages.LayoutTemplate,
  PencilLine: "problem-content.svg",
  Image: "problem-display.svg",
  Workflow: "problem-maintenance.svg",
  ShieldCheck: "problem-security.svg",
};

const illustrationImages = {
  service: serviceImages,
  problem: problemImages,
  feature: { ...problemImages, ...serviceImages, Settings: problemImages.Workflow },
};

export function illustrationImageSrc(name, kind = "service") {
  const filename = illustrationImages[kind]?.[name];
  return filename ? `/static/images/${filename}` : null;
}
