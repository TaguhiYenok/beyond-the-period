
/* ==========================================
   BEYOND THE PERIOD
   Global Menstrual Health Dashboard
   ========================================== */

// Exact filename of your uploaded CSV
const DATA_FILE =
    "data/beyond_the_period_unicef_menstrual_health_starter(1).csv";

// Main dashboard data
let menstrualData = [];
let selectedCountry = "";

// Available indicators
const indicators = {
    materials_total: {
        label: "Menstrual Material Use",
        description: "Percentage reporting use of menstrual materials"
    },

    private_total: {
        label: "Access to a Private Place",
        description: "Percentage with a private place to change"
    },

    participation_total: {
        label: "Participation in Daily Activities",
        description: "Percentage participating in activities during menstruation"
    }
};

// ==========================================
// 1. LOAD DATA
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadData();
});

function loadData() {

    Papa.parse(DATA_FILE, {
        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function(results) {

            if (results.errors.length > 0) {
                console.warn("CSV parsing warnings:", results.errors);
            }

            menstrualData = results.data
                .filter(row => row.country && row.iso3)
                .map(row => ({
                    ...row,
                    country: row.country.trim(),
                    iso3: row.iso3.trim().toUpperCase(),
                    year: row.year
                }));

            if (menstrualData.length === 0) {
                showError("No valid country data was found.");
                return;
            }

            console.log(
                "Successfully loaded",
                menstrualData.length,
                "country records"
            );

            populateCountryDropdown();
            initializeDashboard();
        },

        error: function(error) {
            console.error("Error loading CSV:", error);

            showError(
                "Unable to load the dataset. Check the CSV filename and path."
            );
        }
    });
}

// ==========================================
// 2. POPULATE COUNTRY DROPDOWN
// ==========================================

function populateCountryDropdown() {

    const countrySelect =
        document.getElementById("country-select");

    // Alphabetical order
    const sortedCountries = [...menstrualData].sort(
        (a, b) => a.country.localeCompare(b.country)
    );

    sortedCountries.forEach(country => {

        const option = document.createElement("option");

        option.value = country.iso3;
        option.textContent = country.country;

        countrySelect.appendChild(option);
    });

    countrySelect.addEventListener("change", event => {
        selectCountry(event.target.value);
    });
}

// ==========================================
// 3. INITIALIZE DASHBOARD
// ==========================================

function initializeDashboard() {

    const indicatorSelect =
        document.getElementById("indicator-select");

    // Draw initial map
    updateMap();

    // Update map when indicator changes
    indicatorSelect.addEventListener("change", () => {
        updateMap();
    });

    // Show instructions until a country is selected
    document.getElementById("selected-country-name")
        .textContent = "Select a country to explore its data";
}

// ==========================================
// 4. HELPER FUNCTIONS
// ==========================================

// Read a numerical CSV value safely.
// Empty or invalid values should NOT become zero.
function getNumericValue(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

// Display percentages with one decimal place.
function formatPercentage(value) {

    const number = getNumericValue(value);

    if (number === null) {
        return "No data";
    }

    return number.toFixed(1) + "%";
}

// Look up country by ISO3 code.
function findCountry(iso3) {

    return menstrualData.find(
        country => country.iso3 === iso3
    );
}

// ==========================================
// 5. SELECT A COUNTRY
// ==========================================

function selectCountry(iso3) {

    selectedCountry = iso3;

    const countrySelect =
        document.getElementById("country-select");

    countrySelect.value = iso3;

    const country = findCountry(iso3);

    if (!country) {
        clearCountryStats();
        return;
    }

    updateCountryStats(country);
}

// ==========================================
// 6. UPDATE COUNTRY STATISTICS
// ==========================================

function updateCountryStats(country) {

    document.getElementById("selected-country-name")
        .textContent = country.country;

    document.getElementById("data-year")
        .textContent = `JMP estimate year: ${country.year}`;

    document.getElementById("materials-value")
        .textContent = formatPercentage(
            country.materials_total
        );

    document.getElementById("private-value")
        .textContent = formatPercentage(
            country.private_total
        );

    document.getElementById("participation-value")
        .textContent = formatPercentage(
            country.participation_total
        );
}

// Clear statistics when no country is selected.
function clearCountryStats() {

    document.getElementById("selected-country-name")
        .textContent = "Select a country to explore its data";

    document.getElementById("data-year")
        .textContent = "";

    document.getElementById("materials-value")
        .textContent = "--";

    document.getElementById("private-value")
        .textContent = "--";

    document.getElementById("participation-value")
        .textContent = "--";
}

// ==========================================
// 7. CREATE INTERACTIVE WORLD MAP
// ==========================================

function updateMap() {

    const indicator =
        document.getElementById("indicator-select").value;

    const config = indicators[indicator];

    if (!config) {
        console.error("Unknown indicator:", indicator);
        return;
    }

    // Only map countries that have a valid value.
    const validCountries = menstrualData.filter(country => {

        const value = getNumericValue(country[indicator]);

        return value !== null &&
               value >= 0 &&
               value <= 100;
    });

    const locations =
        validCountries.map(country => country.iso3);

    const values =
        validCountries.map(country =>
            getNumericValue(country[indicator])
        );

    const names =
        validCountries.map(country => country.country);

    const years =
        validCountries.map(country => country.year);

    // Plotly choropleth data
    const mapData = [{
        type: "choropleth",

        locationmode: "ISO-3",

        locations: locations,
        z: values,

        text: names,

        customdata: years,

        zmin: 0,
        zmax: 100,

        colorscale: [
            [0.0, "#f6e4ef"],
            [0.25, "#e7b6d0"],
            [0.5, "#cb84af"],
            [0.75, "#a65889"],
            [1.0, "#6e305c"]
        ],

        colorbar: {
            title: {
                text: "%"
            },
            thickness: 15,
            len: 0.75,
            ticksuffix: "%"
        },

        marker: {
            line: {
                color: "#ffffff",
                width: 0.4
            }
        },

        hovertemplate:
            "<b>%{text}</b><br>" +
            config.label + ": %{z:.1f}%<br>" +
            "Estimate year: %{customdata}" +
            "<extra></extra>"
    }];

    // Map layout
    const layout = {

        title: {
            text: config.label,
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
            b: 10
        },

        height: 500
    };

    const plotConfig = {
        responsive: true,
        displaylogo: false,
        displayModeBar: true
    };

    Plotly.react(
        "world-map",
        mapData,
        layout,
        plotConfig
    ).then(() => {

        const mapElement =
            document.getElementById("world-map");

        // Replace existing click handler to avoid duplicates.
        mapElement.removeAllListeners("plotly_click");

        mapElement.on("plotly_click", event => {

            const point = event.points[0];

            if (point && point.location) {
                selectCountry(point.location);
            }
        });
    });
}

// ==========================================
// 8. ERROR HANDLING
// ==========================================

function showError(message) {

    const mapElement =
        document.getElementById("world-map");

    mapElement.textContent = "";

    const errorMessage = document.createElement("p");

    errorMessage.textContent = message;
    errorMessage.style.color = "#a12350";
    errorMessage.style.padding = "30px";
    errorMessage.style.textAlign = "center";

    mapElement.appendChild(errorMessage);
}
