export interface ChromeLink {
  label: string;
  href: string;
  external?: boolean;
}

export const chromeBrand = {
  title: "CBE Thermal Comfort Tool",
  eyebrow: "Center for the Built Environment",
  headerLogoSrc: "/brand-media/CBE-logo-2018.png",
  footerLogoSrc: "/brand-media/CBE-logo-2019-white.png",
  berkeleyLogoSrc: "/brand-media/ucb-logo-2024-white.png",
} as const;

export const headerActionLinks: ChromeLink[] = [
];

export const footerContactLinks: ChromeLink[] = [
  {
    label: "Contact",
    href: "https://github.com/FedericoTartarini",
    external: true,
  },
];

export const footerDocumentationLink: ChromeLink = {
  label: "Documentation",
  href: "https://center-for-the-built-environment.gitbook.io/thermal-comfort-tool",
  external: true,
};

export const footerGithubLink: ChromeLink = {
  label: "GitHub",
  href: "https://github.com/FedericoTartarini/comfort-tool",
  external: true,
};

export const footerSummary =
  "Open-source thermal comfort calculations and charting.";

export const footerCitation =
  "Tartarini, F., Schiavon, S., Cheung, T., Hoyt, T., 2020. CBE Thermal Comfort Tool: online tool for thermal comfort calculations and visualizations. SoftwareX 12, 100563. https://doi.org/10.1016/j.softx.2020.100563";
