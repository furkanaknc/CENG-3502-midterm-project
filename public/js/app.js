// Initialize map
var map = L.map("map").setView([20, 0], 2); // Default global view

// Add OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let landmarks = []; // Store landmarks
let currentLandmarkIndex = 0; // For tracking which landmark we are adding notes to
let selectedLandmarks = []; // For storing selected landmarks for visit plan
let markers = []; // Store markers for easy reference
let visitedLandmarks = []; // Store visited landmarks IDs

// Fetch existing landmarks from the database when page loads
function fetchLandmarks() {
  // First load all visited landmarks to check against
  fetch("http://localhost:5000/api/visited")
    .then((response) => response.json())
    .then((visitedData) => {
      // Store visited landmark IDs for quick lookup
      visitedLandmarks = visitedData.map((visit) => visit.landmark._id);

      // Then load all landmarks
      return fetch("http://localhost:5000/api/landmarks");
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

// Call fetchLandmarks when page loads
document.addEventListener("DOMContentLoaded", fetchLandmarks);

// Add landmark on map click
map.on("click", function (e) {
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
    name: defaultName, // Now using a more descriptive default name
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
      e.stopPropagation(); // Prevent the header's click event
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

    // Add visited button if the landmark has an ID
    if (point._id) {
      // Edit button
      let editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit-button";
      editBtn.style.marginLeft = "10px";
      editBtn.addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent the header's click event
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
        e.stopPropagation(); // Prevent the header's click event
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
        e.stopPropagation(); // Prevent the header's click event
        viewVisitHistory(point._id);
      });
      btnContainer.appendChild(historyBtn);

      // Delete button
      let deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-button";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent the header's click event
        deleteLandmark(point._id);
      });
      btnContainer.appendChild(deleteBtn);
    }

    details.appendChild(btnContainer);
    li.appendChild(header);
    li.appendChild(details);
    list.appendChild(li);
  });
}

// Modal handling
const addNotesModal = document.getElementById("addNotesModal");
const visitedModal = document.getElementById("visitedModal");
const planVisitModal = document.getElementById("planVisitModal");
const visitHistoryModal = document.getElementById("visitHistoryModal");

// Close buttons
document.getElementById("closeNotesModal").onclick = () =>
  (addNotesModal.style.display = "none");
document.getElementById("closeVisitedModal").onclick = () =>
  (visitedModal.style.display = "none");
document.getElementById("closePlanModal").onclick = () =>
  (planVisitModal.style.display = "none");
document.getElementById("closeVisitHistoryModal").onclick = () =>
  (visitHistoryModal.style.display = "none");

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target === addNotesModal) addNotesModal.style.display = "none";
  if (event.target === visitedModal) visitedModal.style.display = "none";
  if (event.target === planVisitModal) planVisitModal.style.display = "none";
  if (event.target === visitHistoryModal)
    visitHistoryModal.style.display = "none";
};

// Add Notes Button
document.getElementById("addNotesBtn").addEventListener("click", function () {
  if (landmarks.length === 0) {
    alert("No landmarks selected! Click on the map to add landmarks.");
    return;
  }

  currentLandmarkIndex = landmarks.length - 1; // Default to the last added landmark
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

// Handle Notes Form Submission
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

  // Send to backend
  fetch("http://localhost:5000/api/landmarks", {
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

// Visited Landmarks Button
document.getElementById("visitedBtn").addEventListener("click", function () {
  // Fetch visited landmarks from backend
  fetch("http://localhost:5000/api/visited")
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

// Create Visiting Plan Button
document.getElementById("planVisitBtn").addEventListener("click", function () {
  if (landmarks.length === 0) {
    alert("No landmarks selected! Click on the map to add landmarks.");
    return;
  }

  // Reset selections
  selectedLandmarks = [];

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

// Toggle visit status function
function toggleVisitStatus(landmarkId) {
  const isCurrentlyVisited = isVisited(landmarkId);

  if (isCurrentlyVisited) {
    // If already visited, find the visit record to delete
    fetch("http://localhost:5000/api/visited")
      .then((response) => response.json())
      .then((visits) => {
        // Find the visit record for this landmark
        const visitRecord = visits.find((v) => v.landmark._id === landmarkId);

        if (visitRecord) {
          // Delete the visit record
          return fetch(`http://localhost:5000/api/visited/${visitRecord._id}`, {
            method: "DELETE",
          });
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
    fetch("http://localhost:5000/api/visited", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        landmarkId: landmarkId,
        visitor_name: "Visiter",
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

// Handle Plan Form Submission
document.getElementById("planForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const visitorName = document.getElementById("visitorName").value;

  // Get all checked landmark checkboxes
  const checkedLandmarks = document.querySelectorAll(
    'input[type="checkbox"]:checked'
  );

  if (checkedLandmarks.length === 0) {
    alert("Please select at least one landmark for your plan!");
    return;
  }

  // Create an array of promises for each selected landmark
  const updatePromises = Array.from(checkedLandmarks).map((checkbox) => {
    const landmarkId = checkbox.value;
    const landmarkIndex = parseInt(checkbox.dataset.index);
    const noteInput = document.getElementById(`note-${landmarkId}`);
    const notes = noteInput ? noteInput.value : "";

    // Find the landmark
    const landmark = landmarks[landmarkIndex];

    // Simply use the new note directly - no formatting or prefixes
    const updatedNotes = notes;

    // Update landmark notes
    return fetch(`http://localhost:5000/api/landmarks/${landmarkId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes: updatedNotes,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Update local data
        landmarks[landmarkIndex].notes = updatedNotes;

        // Update marker popup content
        if (markers[landmarkIndex]) {
          markers[landmarkIndex].setPopupContent(
            createPopupContent({
              name: landmark.name,
              location: {
                latitude: landmark.latitude,
                longitude: landmark.longitude,
              },
              description: landmark.description,
              category: landmark.category,
              notes: updatedNotes,
            })
          );
        }

        return data;
      });
  });

  // Wait for all updates to complete
  Promise.all(updatePromises)
    .then((results) => {
      alert(`Visiting plan created for ${checkedLandmarks.length} landmarks!`);
      planVisitModal.style.display = "none";
      updateLandmarkList(); // Update the list to show the new notes
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error creating visit plan!");
    });
});

// Delete landmark function
function deleteLandmark(landmarkId) {
  // Ask for confirmation
  if (confirm("Are you sure you want to delete this landmark?")) {
    // Delete from backend first
    fetch(`http://localhost:5000/api/landmarks/${landmarkId}`, {
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

// View Visit History function
function viewVisitHistory(landmarkId) {
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
  fetch(`http://localhost:5000/api/visited/${landmarkId}`)
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

// Edit landmark function
function editLandmark(landmarkId) {
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

    // Send PUT request to update the landmark
    fetch(`http://localhost:5000/api/landmarks/${landmarkId}`, {
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
