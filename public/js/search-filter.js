// Main filter function that applies all filters
function filterLandmarks(landmarks, filters) {
  return landmarks.filter((landmark) => {
    // If no filters are provided, return all landmarks
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    // Apply text search (name, description, notes)
    if (
      filters.searchText &&
      !matchesTextSearch(landmark, filters.searchText)
    ) {
      return false;
    }

    // Apply category filter
    if (
      filters.category &&
      filters.category !== "all" &&
      landmark.category !== filters.category
    ) {
      return false;
    }

    // Apply visited filter
    if (filters.visited !== undefined) {
      const isLandmarkVisited = isVisited(landmark._id);
      if (filters.visited && !isLandmarkVisited) {
        return false;
      }
      if (!filters.visited && isLandmarkVisited) {
        return false;
      }
    }

    // Apply location filter (if provided)
    if (filters.location && !isInLocationRange(landmark, filters.location)) {
      return false;
    }

    // Passed all filters
    return true;
  });
}

// Check if landmark matches text search
function matchesTextSearch(landmark, searchText) {
  if (!searchText) return true;

  const searchLower = searchText.toLowerCase();

  // Search in name
  if (landmark.name && landmark.name.toLowerCase().includes(searchLower)) {
    return true;
  }

  // Search in description
  if (
    landmark.description &&
    landmark.description.toLowerCase().includes(searchLower)
  ) {
    return true;
  }

  // Search in notes
  if (landmark.notes && landmark.notes.toLowerCase().includes(searchLower)) {
    return true;
  }

  return false;
}

// Check if landmark is within a location range
function isInLocationRange(landmark, locationFilter) {
  if (!locationFilter.center || !locationFilter.radius) {
    return true;
  }

  const center = locationFilter.center; 
  const radius = locationFilter.radius; 

  const distance = calculateDistance(
    center.lat,
    center.lng,
    landmark.latitude,
    landmark.longitude
  );

  return distance <= radius;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// Extract unique categories from landmarks
function getUniqueCategories(landmarks) {
  const categories = new Set();
  landmarks.forEach((landmark) => {
    if (landmark.category) {
      categories.add(landmark.category);
    }
  });
  return Array.from(categories);
}

// Initialize search and filter controls
function initSearchAndFilter() {
  const searchForm = document.getElementById("landmarkSearchForm");
  if (!searchForm) {
    console.error("Search form not found");
    return;
  }

  // Handle search form submission
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const searchText = document.getElementById("searchText").value;
    const categoryFilter = document.getElementById("categoryFilter").value;
    const visitedFilter = document.getElementById("visitedFilter").value;

    const filters = {};

    if (searchText) {
      filters.searchText = searchText;
    }

    if (categoryFilter && categoryFilter !== "all") {
      filters.category = categoryFilter;
    }

    if (visitedFilter !== "all") {
      filters.visited = visitedFilter === "visited";
    }

    // Apply filters and update UI
    applyFiltersAndUpdateUI(filters);
  });

  document
    .getElementById("resetFilters")
    .addEventListener("click", function () {
      document.getElementById("searchText").value = "";
      document.getElementById("categoryFilter").value = "all";
      document.getElementById("visitedFilter").value = "all";

      // Clear filters and show all landmarks
      applyFiltersAndUpdateUI({});
    });

  // Initialize category filter options
  updateCategoryFilterOptions();
}

// Apply filters and update UI
function applyFiltersAndUpdateUI(filters) {
  // Get all landmarks
  const filteredLandmarks = filterLandmarks(landmarks, filters);

  updateLandmarkListWithFiltered(filteredLandmarks);

  updateMapMarkers(filteredLandmarks);
}

// Update the landmark list with filtered results
function updateLandmarkListWithFiltered(filteredLandmarks) {
  const list = document.getElementById("landmarkList");
  list.innerHTML = "";

  if (filteredLandmarks.length === 0) {
    const noResults = document.createElement("p");
    noResults.textContent = "No landmarks match your search criteria.";
    noResults.style.textAlign = "center";
    noResults.style.padding = "20px";
    list.appendChild(noResults);
    return;
  }

  // Reuse existing updateLandmarkList functionality with filtered data
  updateLandmarkListItems(filteredLandmarks);
}

// Update map markers to only show filtered landmarks
function updateMapMarkers(filteredLandmarks) {
  // First hide all markers
  markers.forEach((marker) => {
    map.removeLayer(marker);
  });

  // Then only show filtered markers
  filteredLandmarks.forEach((landmark) => {
    const index = landmarks.findIndex(
      (l) =>
        l.latitude === landmark.latitude && l.longitude === landmark.longitude
    );

    if (index !== -1 && markers[index]) {
      markers[index].addTo(map);
    }
  });
}

// Update category filter options based on available categories
function updateCategoryFilterOptions() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  while (categoryFilter.options.length > 1) {
    categoryFilter.remove(1);
  }

  const categories = getUniqueCategories(landmarks);

  // Add options for each category
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

// Function to help render filtered landmark list
function updateLandmarkListItems(landmarksToShow) {
 
  // For now, we'll rely on the parent page to implement this functionality
  if (window.updateLandmarkListWithArray) {
    window.updateLandmarkListWithArray(landmarksToShow);
  } else {
    console.error("updateLandmarkListWithArray function not found");
  }
}
