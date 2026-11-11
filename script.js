
/* ==========================================
   BEYOND THE PERIOD
   Global Menstrual Health Dashboard
   ========================================== */

// ==========================================
// 1. CONFIGURATION
// ==========================================

// All-years UNICEF dataset
const DATA_FILE =
    "data/beyond_the_period_unicef_menstrual_health_all_years.csv";

// Dashboard state
let menstrualData = [];
let selectedCountry = "";
let selectedYear = null;

// Supported indicators
const indicators = {
    materials_total: {
        label: "Menstrual Material Use",
        description:
            "Percentage reporting menstrual material use"
    },

    private_total: {
        label: "Access to a Private Place",
        description:
            "Percentage with a private place to wash and change"
    },

    participation_total: {
        label: "Participation in Daily Activities",
        description:
            "Percentage reporting participation during menstruation"
    }
};


// ==========================================
// 2. INITIALIZE APPLICATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadData();
});


// ==========================================
// 3. LOAD UNICEF DATA
// ==========================================

function loadData() {

    Papa.parse(DATA_FILE, {

        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function(results) {

            if (results.errors.length > 0) {
                console.warn(
                    "CSV parsing warnings:",
                    results.errors
                );
            }

            // Clean and validate each record
            menstrualData = results.data
                .filter(row => {

                    return (
                        row.country &&
                        row.iso3 &&
                        String(row.year).trim() !== "" &&
                        Number.isFinite(Number(row.year))
                    );

                })
                .map(row => {

                    return {
                        ...row,

                        country: row.country.trim(),

                        iso3: row.iso3
                            .trim()
                            .toUpperCase(),

                        year: Number(row.year)
                    };

                });

            if (menstrualData.length === 0) {

                showError(
                    "No valid country data was found."
                );

                return;
            }

            console.log(
                "Successfully loaded",
                menstrualData.length,
                "UNICEF records"
            );

            // Initialize filters
            populateYearDropdown();
            populateCountryDropdown();

            // Initialize interactions
            initializeDashboard();
        },

        error: function(error) {

            console.error(
                "Error loading UNICEF CSV:",
                error
            );

            showError(
                "Unable to load the dataset. " +
                "Check the CSV filename and GitHub path."
            );
        }
    });
}


// ==========================================
// 4. YEAR SELECTOR
// ==========================================

function populateYearDropdown() {

    const yearSelect =
        document.getElementById("year-select");

    // Get unique available years
    const years = [
        ...new Set(
            menstrualData.map(row => row.year)
        )
    ].sort((a, b) => b - a);

    yearSelect.innerHTML = "";

    // Populate the dropdown
    years.forEach(year => {

        const option =
            document.createElement("option");

        option.value = String(year);
        option.textContent = String(year);

        yearSelect.appendChild(option);
    });

    // Default to latest year
    selectedYear = years[0];

    yearSelect.value = String(selectedYear);

    // Handle year changes
    yearSelect.addEventListener("change", event => {

        selectedYear = Number(event.target.value);

        console.log(
            "Selected year:",
            selectedYear
        );

        updateMap();
        updateSelectedCountry();
    });
}


// ==========================================
// 5. COUNTRY SELECTOR
// ==========================================

function populateCountryDropdown() {

    const countrySelect =
        document.getElementById("country-select");

    // Use ISO3 codes to identify unique countries
    const countryMap = new Map();

    menstrualData.forEach(row => {

        countryMap.set(
            row.iso3,
            row.country
        );
    });

    // Sort countries alphabetically
    const countries = [
        ...countryMap.entries()
    ].sort((a, b) => {

        return a[1].localeCompare(b[1]);
    });

    countrySelect.innerHTML =
        '<option value="">Choose a country</option>';

    countries.forEach(([iso3, name]) => {

        const option =
            document.createElement("option");

        option.value = iso3;
        option.textContent = name;

        countrySelect.appendChild(option);
    });

    // Handle dropdown selection
    countrySelect.addEventListener("change", event => {

        selectCountry(event.target.value);
    });
}


// ==========================================
// 6. INITIALIZE DASHBOARD EVENTS
// ==========================================

function initializeDashboard() {

    const indicatorSelect =
        document.getElementById("indicator-select");

    indicatorSelect.addEventListener("change", () => {

        updateMap();
    });

    clearCountryStats();

    updateMap();
}


// ==========================================
// 7. DATA HELPER FUNCTIONS
// ==========================================

// Convert values safely.
// Missing values remain missing, NOT zero.
function getNumericValue(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return number;
}


// Format data as percentage
function formatPercentage(value) {

    const number = getNumericValue(value);

    if (
        number === null ||
        number < 0 ||
        number > 100
    ) {
        return "No data";
    }

    return number.toFixed(1) + "%";
}


// Get records for the currently selected year
function getYearData() {

    return menstrualData.filter(row => {

        return row.year === selectedYear;
    });
}


// Find a country in the selected year
function findCountry(iso3) {

    return getYearData().find(row => {

        return row.iso3 === iso3;
    });
}


// ==========================================
// 8. SELECT A COUNTRY
// ==========================================

function selectCountry(iso3) {

    selectedCountry = iso3;

    document.getElementById("country-select")
        .value = iso3;

    updateSelectedCountry();
}


// ==========================================
// 9. UPDATE SELECTED COUNTRY
// ==========================================

function updateSelectedCountry() {

    if (!selectedCountry) {

        clearCountryStats();
        return;
    }

    const country = findCountry(selectedCountry);

    if (!country) {

        showMissingCountryData();
        return;
    }

    updateCountryStats(country);
}


// ==========================================
// 10. UPDATE COUNTRY STATISTICS
// ==========================================

function updateCountryStats(country) {

    document.getElementById(
        "selected-country-name"
    ).textContent = country.country;

    document.getElementById(
        "data-year"
    ).textContent =
        `JMP estimate year: ${selectedYear}`;

    // Menstrual material use
    document.getElementById(
        "materials-value"
    ).textContent = formatPercentage(
        country.materials_total
    );

    // Access to private spaces
    document.getElementById(
        "private-value"
    ).textContent = formatPercentage(
        country.private_total
    );

    // Participation in daily activities
    document.getElementById(
        "participation-value"
    ).textContent = formatPercentage(
        country.participation_total
    );
}


// ==========================================
// 11. CLEAR COUNTRY STATISTICS
// ==========================================

function clearCountryStats() {

    document.getElementById(
        "selected-country-name"
    ).textContent =
        "Select a country to explore its data";

    document.getElementById(
        "data-year"
    ).textContent =
        selectedYear !== null
            ? `Selected year: ${selectedYear}`
            : "";

    document.getElementById(
        "materials-value"
    ).textContent = "--";

    document.getElementById(
        "private-value"
    ).textContent = "--";

    document.getElementById(
        "participation-value"
    ).textContent = "--";
}


// ==========================================
// 12. HANDLE MISSING COUNTRY DATA
// ==========================================

function showMissingCountryData() {

    const countrySelect =
        document.getElementById("country-select");

    const countryName =
        countrySelect.selectedOptions[0]?.textContent
        || "Selected country";

    document.getElementById(
        "selected-country-name"
    ).textContent = countryName;

    document.getElementById(
        "data-year"
    ).textContent =
        `No estimate available for ${selectedYear}`;

    [
        "materials-value",
        "private-value",
        "participation-value"
    ].forEach(id => {

        document.getElementById(id)
            .textContent = "No data";
    });
}


// ==========================================
// 13. INTERACTIVE WORLD MAP
// ==========================================

function updateMap() {

    const indicator =
        document.getElementById(
            "indicator-select"
        ).value;

    const indicatorConfig =
        indicators[indicator];

    if (
        !indicatorConfig ||
        selectedYear === null
    ) {
        return;
    }

    // Step 1: Filter to selected year
    const yearData = getYearData();

    // Step 2: Keep only valid indicator values
    const validCountries = yearData.filter(row => {

        const value =
            getNumericValue(row[indicator]);

        return (
            value !== null &&
            value >= 0 &&
            value <= 100
        );
    });

    // Step 3: Update reporting labels
    updateMapLabels(
        indicatorConfig.label,
        yearData.length,
        validCountries.length
    );

    // Step 4: Prepare Plotly data
    const mapData = [{

        type: "choropleth",

        locationmode: "ISO-3",

        locations: validCountries.map(
            row => row.iso3
        ),

        z: validCountries.map(
            row => getNumericValue(row[indicator])
        ),

        text: validCountries.map(
            row => row.country
        ),

        zmin: 0,
        zmax: 100,

        colorscale: [
            [0.00, "#f6e4ef"],
            [0.25, "#e7b6d0"],
            [0.50, "#cb84af"],
            [0.75, "#a65889"],
            [1.00, "#6e305c"]
        ],

        colorbar: {
            title: {
                text: "%"
            },

            ticksuffix: "%",
            thickness: 15,
            len: 0.75
        },

        marker: {
            line: {
                color: "#ffffff",
                width: 0.4
            }
        },

        hovertemplate:
            "<b>%{text}</b><br>" +
            indicatorConfig.label +
            ": %{z:.1f}%<br>" +
            "JMP estimate year: " +
            selectedYear +
            "<extra></extra>"
    }];


    // Step 5: Map layout
    const layout = {

        title: {
            text:
                `${indicatorConfig.label} — ${selectedYear}`,

            font: {
                size: 18,
                color: "#653052"
            },

            x: 0.5
        },

        geo: {
            scope: "world",

            projection: {
                type: "natural earth"
            },

            showframe: false,
            showcoastlines: true,
            coastlinecolor: "#e5dce5",

            showcountries: true,
            countrycolor: "#ffffff",

            showland: true,
            landcolor: "#eeeeee",

            showocean: true,
            oceancolor: "#f8f5fa"
        },

        paper_bgcolor: "#fdfbfd",
        plot_bgcolor: "#fdfbfd",

        margin: {
            l: 10,
            r: 10,
            t: 65,
            b: 25
        },

        height: 500
    };


    // Step 6: Plotly configuration
    const plotConfig = {

        responsive: true,
        displaylogo: false,
        displayModeBar: true
    };


    // Step 7: Render map
    Plotly.react(
        "world-map",
        mapData,
        layout,
        plotConfig
    ).then(() => {

        const mapElement =
            document.getElementById("world-map");

        // Prevent duplicate click listeners
        mapElement.removeAllListeners(
            "plotly_click"
        );

        // Handle clicks on countries
        mapElement.on(
            "plotly_click",
            event => {

                const point = event.points[0];

                if (
                    point &&
                    point.location
                ) {
                    selectCountry(
                        point.location
                    );
                }
            }
        );

    }).catch(error => {

        console.error(
            "Map rendering error:",
            error
        );

        showError(
            "Unable to render the world map."
        );
    });
}


// ==========================================
// 14. UPDATE YEAR AND COVERAGE LABELS
// ==========================================

function updateMapLabels(
    indicatorLabel,
    totalCountries,
    validCountries
) {

    document.getElementById(
        "map-year-label"
    ).textContent =
        `Displaying JMP estimates for ${selectedYear}`;

    document.getElementById(
        "map-coverage"
    ).textContent =
        `${validCountries} of ${totalCountries} ` +
        `countries/territories with records ` +
        `for ${selectedYear} have available ` +
        `${indicatorLabel.toLowerCase()} data.`;
}


// ==========================================
// 15. ERROR HANDLING
// ==========================================

function showError(message) {

    const mapElement =
        document.getElementById("world-map");

    mapElement.textContent = "";

    const errorMessage =
        document.createElement("p");

    errorMessage.textContent = message;

    errorMessage.style.color = "#a12350";
    errorMessage.style.padding = "30px";
    errorMessage.style.textAlign = "center";

    mapElement.appendChild(errorMessage);
}
