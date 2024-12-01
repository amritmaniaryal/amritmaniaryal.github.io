document.addEventListener("DOMContentLoaded", () => {
    const contentFolder = "content/";
    const defaultPage = "home.html";
  
    // Get the current page name or default to "index.html"
    const page = window.location.pathname.split("/").pop() || "index.html";
  
    // Ensure we only load content files (ignore layout.html or any other non-content files)
    const contentFile =
      page === "index.html" || page === "layout.html"
        ? contentFolder + defaultPage
        : contentFolder + page;
  
    console.log(`Attempting to load content from: ${contentFile}`); // Debugging log
  
    fetch(contentFile)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then((data) => {
        console.log(`Successfully loaded content from: ${contentFile}`);
        document.getElementById("content").innerHTML = data;
      })
      .catch((error) => {
        console.error("Error loading content:", error);
        document.getElementById("content").innerHTML =
          "<p>Error loading page content. Please try again later.</p>";
      });
  });
  