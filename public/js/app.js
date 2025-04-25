// Initialize map
var map = L.map("map").setView([20, 0], 2); 

// Add OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000/api";

let landmarks = []; // Store landmarks
let currentLandmarkIndex = 0; // For tracking which landmark we are adding notes to
let selectedLandmarks = []; // For storing selected landmarks for visit plan
let markers = []; // Store markers for easy reference
let visitedLandmarks = []; // Store visited landmarks IDs
let authToken = localStorage.getItem("authToken"); // Store authentication token
let currentUser = null; // Store current user data

// Check if user is logged in
function isLoggedIn() {
  return !!authToken;
}

// Function to set auth token and user data
function setAuth(token, userData) {
  authToken = token;
  currentUser = userData;
  localStorage.setItem("authToken", token);
  localStorage.setItem("userData", JSON.stringify(userData));

  // Update UI based on authentication status
  updateAuthUI();
}

// Function to clear auth token and user data (logout)
function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");

  // Update UI based on authentication status
  updateAuthUI();
}

// Update UI elements based on authentication status
function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const registerBtn = document.getElementById("registerBtn");
  const userDisplay = document.getElementById("userDisplay");
  const landmarkControls = document.getElementById("landmarkControls");
  const searchFilterContainer = document.getElementById(
    "searchFilterContainer"
  );

  if (isLoggedIn()) {
    // User is logged in
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userDisplay.style.display = "inline-block";
    userDisplay.textContent = `Welcome, ${currentUser.username}`;
    landmarkControls.style.display = "block";
    searchFilterContainer.style.display = "block";

    // Fetch landmarks for the logged-in user
    fetchLandmarks();
  } else {
    // User is logged out
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userDisplay.style.display = "none";
    landmarkControls.style.display = "none";
    searchFilterContainer.style.display = "none";

    // Clear landmarks when logged out
    landmarks = [];
    markers.forEach((marker) => map.removeLayer(marker));
    markers = [];
    updateLandmarkList();
  }
}

// Function to handle API requests with authentication
function authenticatedFetch(url, options = {}) {
  if (!isLoggedIn()) {
    alert("Please log in to access this feature.");
    showAuthModal("login");
    return Promise.reject("Not authenticated");
  }

  // Set default options if not provided
  options = options || {};
  options.headers = options.headers || {};

  // Add authorization header
  options.headers["Authorization"] = `Bearer ${authToken}`;

  return fetch(url, options).then((response) => {
    if (response.status === 401) {
      // If unauthorized, clear auth data and show login
      clearAuth();
      alert("Your session has expired. Please log in again.");
      showAuthModal("login");
      return Promise.reject("Authentication expired");
    }
    return response;
  });
}

// Fetch existing landmarks from the database when user is logged in
function fetchLandmarks() {
  if (!isLoggedIn()) {
    return;
  }

  // First load all visited landmarks to check against
  authenticatedFetch(`${API_BASE_URL}/visited`)
    .then((response) => response.json())
    .then((visitedData) => {
      // Store visited landmark IDs for quick lookup
      visitedLandmarks = visitedData.map((visit) => visit.landmark._id);

      // Then load all landmarks
      return authenticatedFetch(`${API_BASE_URL}/landmarks`);
    })
    .then((response) => response.json())
    .then((data) => {
      // Clear existing landmarks and markers
      landmarks = [];
      markers.forEach((marker) => map.removeLayer(marker));
      markers = [];

      // Add each landmark to our array and to the map
      data.forEach((landmark) => {
        const lat = landmark.location.latitude;
        const lng = landmark.location.longitude;

        // Create marker on map with enhanced popup content
        const marker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup(createPopupContent(landmark))
          .on("click", () => {
            // Find the index of this landmark in our array
            const index = landmarks.findIndex((l) => l._id === landmark._id);
            if (index !== -1) {
              currentLandmarkIndex = index;
            }
          });

        // Store marker reference
        markers.push(marker);

        // Add to landmarks array
        landmarks.push({
          _id: landmark._id,
          latitude: lat,
          longitude: lng,
          name: landmark.name,
          description: landmark.description,
          category: landmark.category,
          notes: landmark.notes,
        });
      });

      updateLandmarkList();
    })
    .catch((error) => {
      console.error("Error fetching landmarks:", error);
    });
}

// Check if a landmark is visited
function isVisited(landmarkId) {
  return visitedLandmarks.includes(landmarkId);
}

// Create enhanced popup content including notes
function createPopupContent(landmark) {
  let content = `<div class="popup-content">
    <h3>${landmark.name || "Unnamed Landmark"}</h3>
    <p>Location: ${landmark.location.latitude}, ${
    landmark.location.longitude
  }</p>`;

  if (landmark.category) {
    content += `<p>Category: ${landmark.category}</p>`;
  }

  if (landmark.description) {
    content += `<p>Description: ${landmark.description}</p>`;
  }

  if (landmark.notes) {
    content += `<p>Notes: <pre style="max-height: 100px; overflow-y: auto; white-space: pre-wrap;">${landmark.notes}</pre></p>`;
  }

  // Add buttons if the landmark has an ID
  if (landmark._id) {
    // Add visited button
    const isAlreadyVisited = isVisited(landmark._id);
    const buttonText = isAlreadyVisited
      ? "Mark as Unvisited"
      : "Mark as Visited";
    const buttonClass = isAlreadyVisited
      ? "visited-button visited"
      : "visited-button";

    content += `
    <button class="${buttonClass}" data-landmark-id="${landmark._id}" onclick="toggleVisitStatus('${landmark._id}')">
      ${buttonText}
    </button>`;

    // Add view visit history button
    content += `
    <button class="history-button" data-landmark-id="${landmark._id}" onclick="viewVisitHistory('${landmark._id}')">
      View Visit History
    </button>`;

    // Add edit button
    content += `
    <button class="edit-button" data-landmark-id="${landmark._id}" onclick="editLandmark('${landmark._id}')">
      Edit
    </button>`;

    // Add delete button
    content += `
    <button class="delete-button" data-landmark-id="${landmark._id}" onclick="deleteLandmark('${landmark._id}')">
      Delete
    </button>`;
  }

  content += `</div>`;
  return content;
}

// Call function to check authentication when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Try to load user data if available
  const savedUserData = localStorage.getItem("userData");
  if (authToken && savedUserData) {
    try {
      currentUser = JSON.parse(savedUserData);
      updateAuthUI();
    } catch (e) {
      // If there's an error parsing saved data, clear auth
      clearAuth();
    }
  } else {
    // No saved auth data, update UI to show login/register buttons
    updateAuthUI();
  }
});

// Add landmark on map click
map.on("click", function (e) {
  // Check if user is logged in before allowing to add landmarks
  if (!isLoggedIn()) {
    alert("Please log in to add landmarks.");
    showAuthModal("login");
    return;
  }

  var lat = e.latlng.lat.toFixed(6);
  var lng = e.latlng.lng.toFixed(6);

  // Generate a descriptive default name
  const defaultName = `Landmark #${landmarks.length + 1} (${lat}, ${lng})`;

  // Create marker
  var marker = L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`<b>${defaultName}</b><br>Lat: ${lat}, Lng: ${lng}`)
    .openPopup();

  // Store marker reference
  markers.push(marker);

  // Store landmark data with explicit name
  landmarks.push({
    latitude: lat,
    longitude: lng,
    name: defaultName,
  });

  updateLandmarkList();
});

// Update landmark list in UI - Enhanced to show more details and notes
function updateLandmarkList() {
  let list = document.getElementById("landmarkList");
  list.innerHTML = "";
  landmarks.forEach((point, index) => {
    let li = document.createElement("li");
    li.className = "landmark-list-item";

    // Create the expandable section
    let header = document.createElement("div");
    header.className = "landmark-header";
    header.textContent = `${point.name || `Landmark ${index + 1}`}: Lat ${
      point.latitude
    }, Lng ${point.longitude}`;

    // Add click handler to expand/collapse details
    header.addEventListener("click", function () {
      details.style.display =
        details.style.display === "none" ? "block" : "none";
    });

    // Create details section
    let details = document.createElement("div");
    details.className = "landmark-details";
    details.style.display = "none";

    // Add category and description if available
    if (point.category) {
      let category = document.createElement("p");
      category.textContent = `Category: ${point.category}`;
      details.appendChild(category);
    }

    if (point.description) {
      let desc = document.createElement("p");
      desc.textContent = `Description: ${point.description}`;
      details.appendChild(desc);
    }

    // Add notes if available
    if (point.notes) {
      let notesTitle = document.createElement("p");
      notesTitle.textContent = "Notes:";
      details.appendChild(notesTitle);

      let notesContent = document.createElement("pre");
      notesContent.textContent = point.notes;
      notesContent.style.maxHeight = "100px";
      notesContent.style.overflowY = "auto";
      notesContent.style.whiteSpace = "pre-wrap";
      notesContent.style.backgroundColor = "#f5f5f5";
      notesContent.style.padding = "5px";
      notesContent.style.borderRadius = "4px";
      details.appendChild(notesContent);
    }

    // Create a button container for better alignment
    let btnContainer = document.createElement("div");
    btnContainer.className = "landmark-buttons";

    // Add view button to center the map on this landmark
    let viewBtn = document.createElement("button");
    viewBtn.textContent = "View on Map";
    viewBtn.className = "view-landmark-btn";
    viewBtn.addEventListener("click", function (e) {
      e.stopPropagation(); 
      map.setView([point.latitude, point.longitude], 13);

      // Find and open the corresponding marker popup
      let markerIndex = landmarks.findIndex(
        (l) => l.latitude === point.latitude && l.longitude === point.longitude
      );
      if (markerIndex !== -1 && markers[markerIndex]) {
        markers[markerIndex].openPopup();
      }
    });
    btnContainer.appendChild(viewBtn);

    // Add select button to select this landmark for adding notes
    let selectBtn = document.createElement("button");
    selectBtn.textContent = "Select";
    selectBtn.className = "select-landmark-btn";
    selectBtn.style.marginLeft = "10px";
    selectBtn.style.backgroundColor = "#28a745";
    selectBtn.addEventListener("click", function (e) {
      e.stopPropagation(); 
      currentLandmarkIndex = index;

      // Give visual feedback to show this landmark is selected
      document.querySelectorAll(".landmark-list-item").forEach((item) => {
        item.classList.remove("selected-landmark");
      });
      li.classList.add("selected-landmark");

      alert(
        `Selected: ${
          point.name || `Landmark ${index + 1}`
        } - Now you can click "Add Notes" to edit this landmark.`
      );
    });
    btnContainer.appendChild(selectBtn);

    // Add visited button if the landmark has an ID
    if (point._id) {
      
      let editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit-button";
      editBtn.style.marginLeft = "10px";
      editBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        editLandmark(point._id);
      });
      btnContainer.appendChild(editBtn);

      // Visited button
      const isAlreadyVisited = isVisited(point._id);
      const visitBtnText = isAlreadyVisited
        ? "Mark as Unvisited"
        : "Mark as Visited";
      const visitBtnClass = isAlreadyVisited
        ? "visited-button visited"
        : "visited-button";

      let visitBtn = document.createElement("button");
      visitBtn.textContent = visitBtnText;
      visitBtn.className = visitBtnClass;
      visitBtn.style.marginLeft = "10px";
      visitBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        toggleVisitStatus(point._id);
      });
      btnContainer.appendChild(visitBtn);

      // View Visit History button
      let historyBtn = document.createElement("button");
      historyBtn.textContent = "View Visit History";
      historyBtn.className = "history-button";
      historyBtn.style.marginLeft = "10px";
      historyBtn.style.backgroundColor = "#17a2b8";
      historyBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        viewVisitHistory(point._id);
      });
      btnContainer.appendChild(historyBtn);

      // Delete button
      let deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-button";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        deleteLandmark(point._id);
      });
      btnContainer.appendChild(deleteBtn);
    }

    details.appendChild(btnContainer);
    li.appendChild(header);
    li.appendChild(details);
    list.appendChild(li);
  });

  // After updating the landmark list, update the category filter options if search utility is loaded
  if (typeof updateCategoryFilterOptions === "function") {
    updateCategoryFilterOptions();
  }
}

// Function to update landmark list with a specific array of landmarks (for search filtering)
window.updateLandmarkListWithArray = function (landmarksToShow) {
  let list = document.getElementById("landmarkList");
  list.innerHTML = "";

  landmarksToShow.forEach((point, index) => {
    // Find the actual index in the original landmarks array
    const originalIndex = landmarks.findIndex(
      (l) =>
        l.latitude === point.latitude &&
        l.longitude === point.longitude &&
        (l._id ? l._id === point._id : true)
    );

    let li = document.createElement("li");
    li.className = "landmark-list-item";

    // Check if this landmark is the currently selected one
    if (originalIndex === currentLandmarkIndex) {
      li.classList.add("selected-landmark");
    }

    // Create the expandable section
    let header = document.createElement("div");
    header.className = "landmark-header";
    header.textContent = `${
      point.name || `Landmark ${originalIndex + 1}`
    }: Lat ${point.latitude}, Lng ${point.longitude}`;

    // Add click handler to expand/collapse details
    header.addEventListener("click", function () {
      details.style.display =
        details.style.display === "none" ? "block" : "none";
    });

    // Create details section
    let details = document.createElement("div");
    details.className = "landmark-details";
    details.style.display = "none";

    // Add category and description if available
    if (point.category) {
      let category = document.createElement("p");
      category.textContent = `Category: ${point.category}`;
      details.appendChild(category);
    }

    if (point.description) {
      let desc = document.createElement("p");
      desc.textContent = `Description: ${point.description}`;
      details.appendChild(desc);
    }

    // Add notes if available
    if (point.notes) {
      let notesTitle = document.createElement("p");
      notesTitle.textContent = "Notes:";
      details.appendChild(notesTitle);

      let notesContent = document.createElement("pre");
      notesContent.textContent = point.notes;
      notesContent.style.maxHeight = "100px";
      notesContent.style.overflowY = "auto";
      notesContent.style.whiteSpace = "pre-wrap";
      notesContent.style.backgroundColor = "#f5f5f5";
      notesContent.style.padding = "5px";
      notesContent.style.borderRadius = "4px";
      details.appendChild(notesContent);
    }

    // Create a button container for better alignment
    let btnContainer = document.createElement("div");
    btnContainer.className = "landmark-buttons";

    // Add view button to center the map on this landmark
    let viewBtn = document.createElement("button");
    viewBtn.textContent = "View on Map";
    viewBtn.className = "view-landmark-btn";
    viewBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent the header's click event
      map.setView([point.latitude, point.longitude], 13);

      // Find and open the corresponding marker popup
      if (originalIndex !== -1 && markers[originalIndex]) {
        markers[originalIndex].openPopup();
      }
    });
    btnContainer.appendChild(viewBtn);

    // Add select button to select this landmark for adding notes
    let selectBtn = document.createElement("button");
    selectBtn.textContent = "Select";
    selectBtn.className = "select-landmark-btn";
    selectBtn.style.marginLeft = "10px";
    selectBtn.style.backgroundColor = "#28a745";
    selectBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent the header's click event

      if (originalIndex !== -1) {
        currentLandmarkIndex = originalIndex;

        // Give visual feedback to show this landmark is selected
        document.querySelectorAll(".landmark-list-item").forEach((item) => {
          item.classList.remove("selected-landmark");
        });
        li.classList.add("selected-landmark");

        alert(
          `Selected: ${
            point.name || `Landmark ${originalIndex + 1}`
          } - Now you can click "Add Notes" to edit this landmark.`
        );
      }
    });
    btnContainer.appendChild(selectBtn);

    // Add visited button if the landmark has an ID
    if (point._id) {
      // Edit button
      let editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit-button";
      editBtn.style.marginLeft = "10px";
      editBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        editLandmark(point._id);
      });
      btnContainer.appendChild(editBtn);

      // Visited button
      const isAlreadyVisited = isVisited(point._id);
      const visitBtnText = isAlreadyVisited
        ? "Mark as Unvisited"
        : "Mark as Visited";
      const visitBtnClass = isAlreadyVisited
        ? "visited-button visited"
        : "visited-button";

      let visitBtn = document.createElement("button");
      visitBtn.textContent = visitBtnText;
      visitBtn.className = visitBtnClass;
      visitBtn.style.marginLeft = "10px";
      visitBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        toggleVisitStatus(point._id);
      });
      btnContainer.appendChild(visitBtn);

      // View Visit History button
      let historyBtn = document.createElement("button");
      historyBtn.textContent = "View Visit History";
      historyBtn.className = "history-button";
      historyBtn.style.marginLeft = "10px";
      historyBtn.style.backgroundColor = "#17a2b8";
      historyBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        viewVisitHistory(point._id);
      });
      btnContainer.appendChild(historyBtn);

      // Delete button
      let deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-button";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", function (e) {
        e.stopPropagation(); 
        deleteLandmark(point._id);
      });
      btnContainer.appendChild(deleteBtn);
    }

    details.appendChild(btnContainer);
    li.appendChild(header);
    li.appendChild(details);
    list.appendChild(li);
  });
};

// Initialize search and filter functionality when document is ready
document.addEventListener("DOMContentLoaded", function () {
  // ... existing code ...

  // Initialize search and filter if the function exists
  if (typeof initSearchAndFilter === "function") {
    // Wait for landmarks to be loaded
    setTimeout(initSearchAndFilter, 1000);
  }
});

// Modal handling - Add authentication modals
const addNotesModal = document.getElementById("addNotesModal");
const visitedModal = document.getElementById("visitedModal");
const planVisitModal = document.getElementById("planVisitModal");
const visitHistoryModal = document.getElementById("visitHistoryModal");
const authModal = document.getElementById("authModal");
const viewPlansModal = document.getElementById("viewPlansModal");

// Close buttons
document.getElementById("closeNotesModal").onclick = () =>
  (addNotesModal.style.display = "none");
document.getElementById("closeVisitedModal").onclick = () =>
  (visitedModal.style.display = "none");
document.getElementById("closePlanModal").onclick = () =>
  (planVisitModal.style.display = "none");
document.getElementById("closeVisitHistoryModal").onclick = () =>
  (visitHistoryModal.style.display = "none");
document.getElementById("closeAuthModal").onclick = () =>
  (authModal.style.display = "none");
document.getElementById("closeViewPlansModal").onclick = () =>
  (viewPlansModal.style.display = "none");

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target === addNotesModal) addNotesModal.style.display = "none";
  if (event.target === visitedModal) visitedModal.style.display = "none";
  if (event.target === planVisitModal) planVisitModal.style.display = "none";
  if (event.target === visitHistoryModal)
    visitHistoryModal.style.display = "none";
  if (event.target === authModal) authModal.style.display = "none";
  if (event.target === viewPlansModal) viewPlansModal.style.display = "none";
};

// Add Notes Button - Require authentication
document.getElementById("addNotesBtn").addEventListener("click", function () {
  if (!isLoggedIn()) {
    alert("Please log in to add notes to landmarks.");
    showAuthModal("login");
    return;
  }

  if (landmarks.length === 0) {
    alert("No landmarks selected! Click on the map to add landmarks.");
    return;
  }

  // Don't automatically default to the last landmark anymore
  // Only set to last landmark if no explicit selection has been made yet
  if (
    currentLandmarkIndex === undefined ||
    currentLandmarkIndex >= landmarks.length
  ) {
    currentLandmarkIndex = landmarks.length - 1;
    alert(
      "No landmark explicitly selected. Using the most recent landmark. Use the 'Select' button to choose a specific landmark."
    );
  }

  const landmark = landmarks[currentLandmarkIndex];

  // Prefill form with existing data if available
  document.getElementById("landmarkName").value =
    landmark.name || `Landmark ${currentLandmarkIndex + 1}`;
  document.getElementById("landmarkCategory").value =
    landmark.category || "other";
  document.getElementById("landmarkDescription").value =
    landmark.description || "";
  document.getElementById("landmarkNotes").value = landmark.notes || "";

  addNotesModal.style.display = "block";
});

// Handle Notes Form Submission - Updated to use authenticatedFetch
document.getElementById("notesForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // Get form data
  const name = document.getElementById("landmarkName").value;
  const category = document.getElementById("landmarkCategory").value;
  const description = document.getElementById("landmarkDescription").value;
  const notes = document.getElementById("landmarkNotes").value;

  // Update landmark data
  landmarks[currentLandmarkIndex].name = name;
  landmarks[currentLandmarkIndex].category = category;
  landmarks[currentLandmarkIndex].description = description;
  landmarks[currentLandmarkIndex].notes = notes;

  // Send to backend with authentication
  authenticatedFetch(`${API_BASE_URL}/landmarks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      latitude: landmarks[currentLandmarkIndex].latitude,
      longitude: landmarks[currentLandmarkIndex].longitude,
      description: description,
      category: category,
      notes: notes,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      landmarks[currentLandmarkIndex]._id = data._id; // Store the backend ID

      // Update marker popup content
      if (markers[currentLandmarkIndex]) {
        markers[currentLandmarkIndex].setPopupContent(
          createPopupContent({
            _id: data._id,
            name: name,
            location: {
              latitude: landmarks[currentLandmarkIndex].latitude,
              longitude: landmarks[currentLandmarkIndex].longitude,
            },
            description: description,
            category: category,
            notes: notes,
          })
        );
      }

      alert("Landmark notes saved successfully!");
      addNotesModal.style.display = "none";
      updateLandmarkList();
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error saving landmark notes!");
    });
});

// Visited Landmarks Button - Updated to use authenticatedFetch
document.getElementById("visitedBtn").addEventListener("click", function () {
  if (!isLoggedIn()) {
    alert("Please log in to view visited landmarks.");
    showAuthModal("login");
    return;
  }

  // Fetch visited landmarks from backend
  authenticatedFetch(`${API_BASE_URL}/visited`)
    .then((response) => response.json())
    .then((data) => {
      const visitedList = document.getElementById("visitedLandmarks");
      visitedList.innerHTML = "";

      if (data.length === 0) {
        visitedList.innerHTML = "<p>No visited landmarks yet!</p>";
      } else {
        data.forEach((visit) => {
          const li = document.createElement("li");
          li.className = "visitedItem";
          li.innerHTML = `
                      <h3>${visit.landmark.name || "Unnamed Landmark"}</h3>
                      <p>Visited on: ${new Date(
                        visit.visited_date
                      ).toLocaleDateString()}</p>
                      <p>Visitor: ${visit.visitor_name}</p>
                      <p>Location: ${visit.landmark.location.latitude}, ${
            visit.landmark.location.longitude
          }</p>
                      <p>Category: ${visit.landmark.category}</p>
                      <p>Notes: ${
                        visit.additional_notes || "No additional notes"
                      }</p>
                  `;
          visitedList.appendChild(li);
        });
      }

      visitedModal.style.display = "block";
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error fetching visited landmarks!");
    });
});

// Create Visiting Plan Button - Updated to work with VisitPlan model
document.getElementById("planVisitBtn").addEventListener("click", function () {
  if (!isLoggedIn()) {
    alert("Please log in to create a visiting plan.");
    showAuthModal("login");
    return;
  }

  if (landmarks.length === 0) {
    alert("No landmarks selected! Click on the map to add landmarks.");
    return;
  }

  // Reset form fields
  document.getElementById("planName").value = "My Visiting Plan";
  document.getElementById("planDescription").value = "";
  document.getElementById("planDate").value = "";

  // Update the plan visit modal to show checkboxes for landmarks
  const landmarkSelectionDiv = document.getElementById("landmarkSelection");
  if (landmarkSelectionDiv) {
    landmarkSelectionDiv.innerHTML = "<h3>Select landmarks for your plan:</h3>";

    // Create checkbox list for landmark selection
    const landmarkList = document.createElement("div");
    landmarks.forEach((landmark, index) => {
      if (landmark._id) {
        // Only show landmarks that have been saved to the database
        const container = document.createElement("div");
        container.className = "landmark-selection-item";

        // Create checkbox for selection
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `landmark-${landmark._id}`;
        checkbox.value = landmark._id;
        checkbox.dataset.index = index;

        // Create label for checkbox
        const label = document.createElement("label");
        label.htmlFor = `landmark-${landmark._id}`;
        label.textContent = `${landmark.name || `Landmark ${index + 1}`}: Lat ${
          landmark.latitude
        }, Lng ${landmark.longitude}`;

        // Create note input for this landmark
        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.id = `note-${landmark._id}`;
        noteInput.placeholder = "Add notes for this landmark";
        noteInput.className = "landmark-note-input";
        noteInput.style.display = "none"; // Initially hidden

        // Show/hide note input when checkbox is checked
        checkbox.addEventListener("change", function () {
          noteInput.style.display = this.checked ? "block" : "none";
        });

        // Display current notes if any
        if (landmark.notes && landmark.notes.trim() !== "") {
          const currentNotes = document.createElement("div");
          currentNotes.className = "current-notes";
          currentNotes.innerHTML = `<small>Current notes: <pre style="max-height: 60px; overflow-y: auto">${landmark.notes}</pre></small>`;
          container.appendChild(checkbox);
          container.appendChild(label);
          container.appendChild(document.createElement("br"));
          container.appendChild(currentNotes);
          container.appendChild(noteInput);
        } else {
          container.appendChild(checkbox);
          container.appendChild(label);
          container.appendChild(document.createElement("br"));
          container.appendChild(noteInput);
        }

        landmarkList.appendChild(container);
      }
    });

    landmarkSelectionDiv.appendChild(landmarkList);
  }

  planVisitModal.style.display = "block";
});

// Toggle visit status function - Updated to use authenticatedFetch
function toggleVisitStatus(landmarkId) {
  if (!isLoggedIn()) {
    alert("Please log in to mark landmarks as visited.");
    showAuthModal("login");
    return;
  }

  const isCurrentlyVisited = isVisited(landmarkId);

  if (isCurrentlyVisited) {
    // If already visited, find the visit record to delete
    authenticatedFetch(`${API_BASE_URL}/visited`)
      .then((response) => response.json())
      .then((visits) => {
        // Find the visit record for this landmark
        const visitRecord = visits.find((v) => v.landmark._id === landmarkId);

        if (visitRecord) {
          // Delete the visit record
          return authenticatedFetch(
            `${API_BASE_URL}/visited/${visitRecord._id}`,
            {
              method: "DELETE",
            }
          );
        }
      })
      .then((response) => {
        if (response && response.ok) {
          // Remove from local visited array
          const index = visitedLandmarks.indexOf(landmarkId);
          if (index > -1) {
            visitedLandmarks.splice(index, 1);
          }

          // Update UI
          updateVisitButtonsForLandmark(landmarkId);

          // Notify user
          alert("Visit record successfully removed.");
        }
      })
      .catch((error) => {
        console.error("Error removing visit:", error);
        alert("Error removing visit record.");
      });
  } else {
    // If not visited, add a new visit record
    authenticatedFetch(`${API_BASE_URL}/visited`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        landmarkId: landmarkId,
        visitor_name: currentUser ? currentUser.username : "Visitor",
        additional_notes: "",
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Add to local visited array
        if (!visitedLandmarks.includes(landmarkId)) {
          visitedLandmarks.push(landmarkId);
        }

        // Update UI
        updateVisitButtonsForLandmark(landmarkId);

        // Notify user
        alert("Landmark marked as visited.");
      })
      .catch((error) => {
        console.error("Error adding visit:", error);
        alert("Error adding visit record.");
      });
  }
}

// Update visit buttons for a specific landmark
function updateVisitButtonsForLandmark(landmarkId) {
  // Update in popups
  const landmarkIndex = landmarks.findIndex((l) => l._id === landmarkId);
  if (landmarkIndex !== -1 && markers[landmarkIndex]) {
    const landmark = landmarks[landmarkIndex];
    markers[landmarkIndex].setPopupContent(
      createPopupContent({
        _id: landmark._id,
        name: landmark.name,
        location: {
          latitude: landmark.latitude,
          longitude: landmark.longitude,
        },
        description: landmark.description,
        category: landmark.category,
        notes: landmark.notes,
      })
    );
  }

  // Update the landmark list
  updateLandmarkList();
}

// Handle Plan Form Submission - Updated to use VisitPlan API without category
document.getElementById("planForm").addEventListener("submit", function (e) {
  e.preventDefault();

  if (!isLoggedIn()) {
    alert("Please log in to create a visiting plan.");
    showAuthModal("login");
    return;
  }

  // Get plan metadata
  const planName = document.getElementById("planName").value;
  const planDescription = document.getElementById("planDescription").value;
  const planDate = document.getElementById("planDate").value;

  // Get all checked landmark checkboxes
  const checkedLandmarks = document.querySelectorAll(
    'input[type="checkbox"]:checked'
  );

  if (checkedLandmarks.length === 0) {
    alert("Please select at least one landmark for your plan!");
    return;
  }

  // Build landmark array for visit plan
  const planLandmarks = Array.from(checkedLandmarks).map((checkbox, index) => {
    const landmarkId = checkbox.value;
    const noteInput = document.getElementById(`note-${landmarkId}`);
    const notes = noteInput ? noteInput.value : "";

    return {
      landmark: landmarkId,
      notes: notes,
      visit_order: index + 1,
    };
  });

  // Create visit plan with the new API - no category needed
  authenticatedFetch(`${API_BASE_URL}/visitplans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: planName,
      description: planDescription,
      planned_date: planDate || null,
      landmarks: planLandmarks,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert(
        `Visiting plan "${data.name}" created with ${data.landmarks.length} landmarks!`
      );
      planVisitModal.style.display = "none";
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error creating visit plan!");
    });
});

// Delete landmark function - Updated to use authenticatedFetch
function deleteLandmark(landmarkId) {
  if (!isLoggedIn()) {
    alert("Please log in to delete landmarks.");
    showAuthModal("login");
    return;
  }

  // Ask for confirmation
  if (confirm("Are you sure you want to delete this landmark?")) {
    // Delete from backend first
    authenticatedFetch(`${API_BASE_URL}/landmarks/${landmarkId}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          // Find index of landmark in array
          const landmarkIndex = landmarks.findIndex(
            (l) => l._id === landmarkId
          );
          if (landmarkIndex !== -1) {
            // Remove marker from map
            if (markers[landmarkIndex]) {
              map.removeLayer(markers[landmarkIndex]);
            }

            // Remove from arrays
            markers.splice(landmarkIndex, 1);
            landmarks.splice(landmarkIndex, 1);

            // Also check if it was in visitedLandmarks and remove
            const visitedIndex = visitedLandmarks.indexOf(landmarkId);
            if (visitedIndex > -1) {
              visitedLandmarks.splice(visitedIndex, 1);
            }

            // Update UI
            updateLandmarkList();

            // Notify user
            alert("Landmark successfully deleted!");
          }
        } else {
          throw new Error("An error occurred while deleting the landmark");
        }
      })
      .catch((error) => {
        console.error("Error deleting landmark:", error);
        alert("Error occurred while deleting the landmark!");
      });
  }
}

// View Visit History function - Updated to use authenticatedFetch
function viewVisitHistory(landmarkId) {
  if (!isLoggedIn()) {
    alert("Please log in to view visit history.");
    showAuthModal("login");
    return;
  }

  // First get the landmark details
  const landmark = landmarks.find((l) => l._id === landmarkId);

  if (!landmark) {
    alert("Landmark not found!");
    return;
  }

  // Show landmark info in the modal
  const landmarkInfoDiv = document.getElementById("landmarkInfo");
  landmarkInfoDiv.innerHTML = `
    <div class="landmark-info">
      <h3>${landmark.name || "Unnamed Landmark"}</h3>
      <p>Location: ${landmark.latitude}, ${landmark.longitude}</p>
      <p>Category: ${landmark.category || "Not categorized"}</p>
      ${
        landmark.description
          ? `<p>Description: ${landmark.description}</p>`
          : ""
      }
    </div>
    <hr>
    <h4>Visit History:</h4>
  `;

  // Fetch visit history for this specific landmark
  authenticatedFetch(`${API_BASE_URL}/visited/${landmarkId}`)
    .then((response) => {
      // Handle 404 status (no visits found) in a user-friendly way
      if (response.status === 404) {
        // We'll handle this case in a friendly way, not as an error
        return { visits: [], noVisits: true };
      }

      if (!response.ok) {
        throw new Error("Could not fetch visit history");
      }

      return response
        .json()
        .then((data) => ({ visits: data, noVisits: false }));
    })
    .then((data) => {
      const visitHistoryList = document.getElementById("visitHistory");
      visitHistoryList.innerHTML = "";

      if (data.noVisits || data.visits.length === 0) {
        visitHistoryList.innerHTML = `
          <p>This landmark has not been visited yet.</p>
          <p>You can mark it as visited by clicking the "Mark as Visited" button.</p>
        `;
      } else {
        data.visits.forEach((visit) => {
          const li = document.createElement("li");
          li.className = "visitedItem";
          li.innerHTML = `
            <p>Visited on: ${new Date(
              visit.visited_date
            ).toLocaleDateString()}</p>
            <p>Visitor: ${visit.visitor_name}</p>
            ${
              visit.additional_notes
                ? `<p>Notes: ${visit.additional_notes}</p>`
                : ""
            }
          `;
          visitHistoryList.appendChild(li);
        });
      }

      // Show the modal
      visitHistoryModal.style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching visit history:", error);
      // Instead of showing an error to the user, display a more friendly message
      const visitHistoryList = document.getElementById("visitHistory");
      visitHistoryList.innerHTML = `
        <p>This landmark has not been visited yet.</p>
        <p>You can mark it as visited by clicking the "Mark as Visited" button.</p>
      `;
      visitHistoryModal.style.display = "block";
    });
}

// Edit landmark function - Updated to use authenticatedFetch
function editLandmark(landmarkId) {
  if (!isLoggedIn()) {
    alert("Please log in to edit landmarks.");
    showAuthModal("login");
    return;
  }

  // Find landmark in our array
  const landmarkIndex = landmarks.findIndex((l) => l._id === landmarkId);

  if (landmarkIndex === -1) {
    alert("Landmark not found!");
    return;
  }

  // Set the current index for the form
  currentLandmarkIndex = landmarkIndex;
  const landmark = landmarks[landmarkIndex];

  // Prefill form with existing data
  document.getElementById("landmarkName").value = landmark.name || "";
  document.getElementById("landmarkCategory").value =
    landmark.category || "other";
  document.getElementById("landmarkDescription").value =
    landmark.description || "";
  document.getElementById("landmarkNotes").value = landmark.notes || "";

  // Change form title to indicate editing
  document.querySelector("#addNotesModal h2").textContent = "Edit Landmark";

  // Show the modal
  addNotesModal.style.display = "block";

  // Override the form submission handler for PUT request
  const notesForm = document.getElementById("notesForm");

  // Store original onsubmit to restore later
  const originalOnSubmit = notesForm.onsubmit;

  notesForm.onsubmit = function (e) {
    e.preventDefault();

    // Get form data
    const name = document.getElementById("landmarkName").value;
    const category = document.getElementById("landmarkCategory").value;
    const description = document.getElementById("landmarkDescription").value;
    const notes = document.getElementById("landmarkNotes").value;

    // Update local landmark data
    landmarks[landmarkIndex].name = name;
    landmarks[landmarkIndex].category = category;
    landmarks[landmarkIndex].description = description;
    landmarks[landmarkIndex].notes = notes;

    // Send PUT request to update the landmark with authentication
    authenticatedFetch(`${API_BASE_URL}/landmarks/${landmarkId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        description: description,
        category: category,
        notes: notes,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Update marker popup content
        if (markers[landmarkIndex]) {
          markers[landmarkIndex].setPopupContent(
            createPopupContent({
              _id: landmarkId,
              name: name,
              location: {
                latitude: landmarks[landmarkIndex].latitude,
                longitude: landmarks[landmarkIndex].longitude,
              },
              description: description,
              category: category,
              notes: notes,
            })
          );
        }

        // Reset form title
        document.querySelector("#addNotesModal h2").textContent =
          "Add Notes to Landmark";

        // Restore original submit handler
        notesForm.onsubmit = originalOnSubmit;

        // Close the modal and update UI
        addNotesModal.style.display = "none";
        updateLandmarkList();

        // Notify user
        alert("Landmark updated successfully!");
      })
      .catch((error) => {
        console.error("Error updating landmark:", error);
        alert("Error updating landmark!");
      });
  };
}

// Show Auth Modal (login or register)
function showAuthModal(mode = "login") {
  // Get the Auth UI container
  const authUIContainer = document.getElementById("authUIContainer");

  if (mode === "login") {
    authUIContainer.innerHTML = `
      <h2>Login</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="loginEmail">Email:</label>
          <input type="email" id="loginEmail" name="email" required>
        </div>
        <div class="form-group">
          <label for="loginPassword">Password:</label>
          <input type="password" id="loginPassword" name="password" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Login</button>
          <button type="button" id="switchToRegister" class="btn-link">Need an account? Register</button>
        </div>
      </form>
    `;

    // Add event listener for switching to register
    document
      .getElementById("switchToRegister")
      .addEventListener("click", () => showAuthModal("register"));

    // Add event listener for login form submission
    document
      .getElementById("loginForm")
      .addEventListener("submit", handleLogin);
  } else {
    authUIContainer.innerHTML = `
      <h2>Register</h2>
      <form id="registerForm">
        <div class="form-group">
          <label for="registerUsername">Username:</label>
          <input type="text" id="registerUsername" name="username" required>
        </div>
        <div class="form-group">
          <label for="registerEmail">Email:</label>
          <input type="email" id="registerEmail" name="email" required>
        </div>
        <div class="form-group">
          <label for="registerPassword">Password:</label>
          <input type="password" id="registerPassword" name="password" required minlength="6">
          <small>Password must be at least 6 characters long</small>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Register</button>
          <button type="button" id="switchToLogin" class="btn-link">Already have an account? Login</button>
        </div>
      </form>
    `;

    // Add event listener for switching to login
    document
      .getElementById("switchToLogin")
      .addEventListener("click", () => showAuthModal("login"));

    // Add event listener for register form submission
    document
      .getElementById("registerForm")
      .addEventListener("submit", handleRegister);
  }

  // Display the modal
  authModal.style.display = "block";
}

// Handle login form submission
function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Login failed");
      }
      return response.json();
    })
    .then((data) => {
      // Store auth token and user data
      setAuth(data.token, {
        _id: data._id,
        username: data.username,
        email: data.email,
      });

      // Close the modal
      authModal.style.display = "none";

      // Notify user
      alert(`Welcome back, ${data.username}!`);

      // Fetch landmarks for the user
      fetchLandmarks();
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Login failed. Please check your credentials and try again.");
    });
}

// Handle register form submission
function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById("registerUsername").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Registration failed");
      }
      return response.json();
    })
    .then((data) => {
      // Store auth token and user data
      setAuth(data.token, {
        _id: data._id,
        username: data.username,
        email: data.email,
      });

      // Close the modal
      authModal.style.display = "none";

      // Notify user
      alert(`Registration successful! Welcome, ${data.username}!`);

      // Fetch landmarks for the user
      fetchLandmarks();
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Registration failed. This email might already be registered.");
    });
}

// Login button click handler
document.getElementById("loginBtn").addEventListener("click", () => {
  showAuthModal("login");
});

// Register button click handler
document.getElementById("registerBtn").addEventListener("click", () => {
  showAuthModal("register");
});

// Logout button click handler
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearAuth();
  alert("You have been logged out successfully.");
});

// View Plans button click handler
document.getElementById("viewPlansBtn").addEventListener("click", function () {
  if (!isLoggedIn()) {
    alert("Please log in to view your visiting plans.");
    showAuthModal("login");
    return;
  }

  // Clear the plan list
  const planListContainer = document.getElementById("planList");
  planListContainer.innerHTML =
    '<div class="loading">Loading your plans...</div>';

  // Fetch visit plans from the API
  authenticatedFetch(`${API_BASE_URL}/visitplans`)
    .then((response) => response.json())
    .then((plans) => {
      planListContainer.innerHTML = "";

      if (plans.length === 0) {
        planListContainer.innerHTML = `
          <div class="no-plans-message">
            <p>You don't have any visiting plans yet.</p>
            <button id="createFirstPlan" class="btn-primary">Create Your First Plan</button>
          </div>
        `;

        document
          .getElementById("createFirstPlan")
          .addEventListener("click", function () {
            viewPlansModal.style.display = "none";
            document.getElementById("planVisitBtn").click();
          });
      } else {
        // Update heading
        document.querySelector(
          ".visit-plans-container h3"
        ).textContent = `Your Visit Plans (${plans.length})`;

        // Display each plan (no longer filtering by category)
        plans.forEach((plan) => {
          const planCard = createPlanCard(plan);
          planListContainer.appendChild(planCard);
        });
      }

      // Show the modal
      viewPlansModal.style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching visit plans:", error);
      planListContainer.innerHTML = `
        <div class="error-message">
          <p>Error loading your visit plans. Please try again later.</p>
        </div>
      `;
      viewPlansModal.style.display = "block";
    });
});

// Create a card for a visit plan
function createPlanCard(plan) {
  const planCard = document.createElement("div");
  planCard.className = "visit-plan-card";

  // Format planned date if exists
  const plannedDateStr = plan.planned_date
    ? new Date(plan.planned_date).toLocaleDateString()
    : "No date specified";

  // Create header
  const header = document.createElement("div");
  header.className = "visit-plan-header";
  header.innerHTML = `
    <h3 class="visit-plan-title">${plan.name}</h3>
    <div class="visit-plan-meta">
      <span>Created: ${new Date(plan.created_date).toLocaleDateString()}</span>
      <span>Planned: ${plannedDateStr}</span>
    </div>
  `;

  // Create plan details section (initially hidden)
  const details = document.createElement("div");
  details.className = "visit-plan-details";

  // Add description if available
  if (plan.description && plan.description.trim() !== "") {
    const description = document.createElement("p");
    description.className = "visit-plan-description";
    description.textContent = plan.description;
    details.appendChild(description);
  }

  // Create landmarks list
  const landmarksList = document.createElement("ul");
  landmarksList.className = "visit-plan-landmarks";

  // Sort landmarks by visit_order if available
  const sortedLandmarks = [...plan.landmarks].sort(
    (a, b) => (a.visit_order || 0) - (b.visit_order || 0)
  );

  // Add each landmark to the list
  sortedLandmarks.forEach((item, index) => {
    const landmark = item.landmark;
    if (!landmark) return; // Skip if landmark reference is missing

    const li = document.createElement("li");
    li.className = "plan-landmark-item";

    // Create detailed landmark information
    let landmarkInfo = `
      <h4>${landmark.name || `Landmark #${index + 1}`}</h4>
      <p class="landmark-location">Location: ${
        landmark.location?.latitude || "N/A"
      }, ${landmark.location?.longitude || "N/A"}</p>
    `;

    // Add category if available
    if (landmark.category) {
      landmarkInfo += `<p class="landmark-category">Category: ${landmark.category}</p>`;
    }

    // Add description if available
    if (landmark.description && landmark.description.trim() !== "") {
      landmarkInfo += `<p class="landmark-description">Description: ${landmark.description}</p>`;
    }

    // Add landmark's own notes if available
    if (landmark.notes && landmark.notes.trim() !== "") {
      landmarkInfo += `
        <div class="landmark-notes">
          <p>Landmark Notes:</p>
          <pre>${landmark.notes}</pre>
        </div>
      `;
    }

    // Add landmark-specific plan notes if available
    if (item.notes && item.notes.trim() !== "") {
      landmarkInfo += `
        <div class="plan-notes">
          <p>Visit Plan Notes:</p>
          <pre class="plan-landmark-notes">${item.notes}</pre>
        </div>
      `;
    }

    // Add visit status indication
    const isVisitedLandmark = isVisited(landmark._id);
    landmarkInfo += `
      <p class="visit-status ${isVisitedLandmark ? "visited" : "not-visited"}">
        Status: ${isVisitedLandmark ? "Visited" : "Not visited yet"}
      </p>
    `;

    li.innerHTML = landmarkInfo;
    landmarksList.appendChild(li);
  });

  details.appendChild(landmarksList);

  // Add action buttons
  const actions = document.createElement("div");
  actions.className = "visit-plan-actions";

  // View on Map button
  const viewBtn = document.createElement("button");
  viewBtn.className = "view-on-map-btn";
  viewBtn.textContent = "View on Map";
  viewBtn.addEventListener("click", () => {
    viewPlanOnMap(plan);
  });

  // Edit Plan button
  const editBtn = document.createElement("button");
  editBtn.className = "edit-plan-btn";
  editBtn.textContent = "Edit Plan";
  editBtn.addEventListener("click", () => {
    editVisitPlan(plan);
  });

  // Delete Plan button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-plan-btn";
  deleteBtn.textContent = "Delete Plan";
  deleteBtn.addEventListener("click", () => {
    deleteVisitPlan(plan._id);
  });

  actions.appendChild(viewBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  details.appendChild(actions);

  // Add sections to card
  planCard.appendChild(header);
  planCard.appendChild(details);

  // Toggle details visibility when header is clicked
  header.addEventListener("click", () => {
    if (details.style.display === "block") {
      details.style.display = "none";
    } else {
      // Hide all other open details first
      document.querySelectorAll(".visit-plan-details").forEach((el) => {
        el.style.display = "none";
      });
      details.style.display = "block";
    }
  });

  return planCard;
}

// View a plan on the map
function viewPlanOnMap(plan) {
  // Close the modal
  viewPlansModal.style.display = "none";

  if (!plan.landmarks || plan.landmarks.length === 0) {
    alert("This plan doesn't have any landmarks to show on the map.");
    return;
  }

  // Create bounds object to fit all landmarks
  const bounds = L.latLngBounds();

  // Add each landmark to bounds and highlight on map
  plan.landmarks.forEach((item, index) => {
    const landmark = item.landmark;
    if (!landmark || !landmark.location) return;

    const lat = landmark.location.latitude;
    const lng = landmark.location.longitude;
    bounds.extend([lat, lng]);

    // Find if this landmark is already on our map
    const landmarkIndex = landmarks.findIndex((l) => l._id === landmark._id);

    if (landmarkIndex !== -1 && markers[landmarkIndex]) {
      // Highlight existing marker
      const marker = markers[landmarkIndex];
      // Add a temporary highlight class or animation if needed

      // Show popup with plan info
      const popupContent = createPopupContent({
        ...landmark,
        name: `${landmark.name} (Plan: ${plan.name})`,
        visit_order: item.visit_order ? `Visit order: ${item.visit_order}` : "",
        plan_notes: item.notes,
      });

      marker.setPopupContent(popupContent);
      marker.openPopup();
    }
  });

  // Fit map to show all landmarks in the plan
  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    });
  }
}

// Edit a visit plan
function editVisitPlan(plan) {
  alert("Edit plan functionality will be implemented soon!");
  // Future implementation: Open the plan form prefilled with the plan data
}

// Delete a visit plan
function deleteVisitPlan(planId) {
  if (
    confirm(
      "Are you sure you want to delete this visiting plan? This action cannot be undone."
    )
  ) {
    authenticatedFetch(`${API_BASE_URL}/visitplans/${planId}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          // Refresh the plans list
          document.getElementById("viewPlansBtn").click();
          alert("Visit plan deleted successfully!");
        } else {
          throw new Error("Failed to delete the plan");
        }
      })
      .catch((error) => {
        console.error("Error deleting plan:", error);
        alert("Error deleting visit plan. Please try again.");
      });
  }
}

// Connect "Create New Plan" button in the plans view
document.getElementById("createNewPlan").addEventListener("click", function () {
  // Close plans modal
  viewPlansModal.style.display = "none";

  // Open create plan modal
  document.getElementById("planVisitBtn").click();
});

// End of application code
