document.addEventListener("DOMContentLoaded", () => {
    const contentFolder = "content/";
    const defaultPage = "home.html";
  
    // Function to load content based on the hash
    const loadContent = () => {
      const hash = window.location.hash || "#home"; // Default to #home
      const page = hash.substring(1) + ".html"; // Remove # and add .html
      const contentFile = contentFolder + page;
  
      console.log(`Attempting to load content from: ${contentFile}`);
  
      fetch(contentFile)
        .then((response) => {
          if (!response.ok) throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
          return response.text();
        })
        .then((data) => {
          document.getElementById("content").innerHTML = data;
        })
        .catch((error) => {
          console.error("Error loading content:", error);
          document.getElementById("content").innerHTML = "<p>Error loading page content. Please try again later.</p>";
        });
    };
  
    // Load initial content
    loadContent();
  
    // Listen for hash changes to update content
    window.addEventListener("hashchange", loadContent);
  });
  