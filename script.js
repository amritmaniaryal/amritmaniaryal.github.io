// Script to dynamically load content into the layout
document.addEventListener("DOMContentLoaded", () => {
    const contentMap = {
      "about.html": "content/about-content.html",
      "research.html": "content/research-content.html",
      "experience.html": "content/experience-content.html",
      "cv.html": "content/cv-content.html",
      "contact.html": "content/contact-content.html",
      "index.html": "content/home-content.html"
    };
  
    const page = window.location.pathname.split("/").pop() || "index.html";
    const contentFile = contentMap[page] || "content/home-content.html";
  
    fetch(contentFile)
      .then((response) => response.text())
      .then((data) => {
        document.getElementById("content").innerHTML = data;
      })
      .catch((error) => {
        console.error("Error loading content:", error);
        document.getElementById("content").innerHTML = "<p>Error loading page content.</p>";
      });
  });
  