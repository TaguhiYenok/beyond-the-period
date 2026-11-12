
/* ==========================================
   BEYOND THE PERIOD
   Global Menstrual Health Dashboard
   ========================================== */

// ==========================================
// 1. CONFIGURATION
// ==========================================

// Existing project dataset
const DATA_FILE =
    "data/beyond_the_period_unicef_menstrual_health_all_years.csv";
const WORLD_BANK_DATA_FILE =
    "data/world_bank_menstrual_material_rates.csv";
const PERIOD_PAD_DATA_FILE =
    "data/period_pad_prices_by_country_2024.csv";
const WORLD_BANK_VALUE_COLUMN =
    "Women and girls who use menstrual materials " +
    "(% of women and girls ages 15-49 who had a menstrual period within the last year)";

// Dashboard state
let menstrualData = [];
let worldBankData = [];
let periodPadData = [];
let selectedCountry = "";
let selectedYear = null;

// Supported indicators
const indicators = {
    materials_total: {
        label: "Menstrual Material Use (existing project dataset)",
        dataSource: "project",
        field: "materials_total",
        maxValue: 100,
        description:
            "Percentage reporting menstrual material use"
    },

    world_bank_materials: {
        label: "Menstrual Material Use (World Bank)",
        dataSource: "worldBank",
        field: "value",
        maxValue: 100,
        description:
            "Women and girls ages 15–49 who had a menstrual period " +
            "in the last year and use menstrual materials"
    },

    period_pad_costs: {
        label: "Cheapest Period Pad Price and Lifetime Cost (2024)",
        dataSource: "periodPads",
        field: "pricePerPad",
        additionalFields: ["lifetimeCost"],
        maxValue: 0.25,
        maxValues: {
            lifetimeCost: 3000
        },
        currency: true,
        description:
            "Price of the cheapest pad and estimated lifetime pad cost"
    },

    private_total: {
        label: "Access to a Private Place",
        dataSource: "project",
        field: "private_total",
        maxValue: 100,
        description:
            "Percentage with a private place to wash and change"
    },

    participation_total: {
        label: "Participation in Daily Activities",
        dataSource: "project",
        field: "participation_total",
        maxValue: 100,
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
// 3. LOAD DATA SOURCES
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
                    "No valid records were found in the existing project dataset."
                );

                return;
            }

            console.log(
                "Successfully loaded",
                menstrualData.length,
                "existing project dataset records"
            );

            loadWorldBankData();
        },

        error: function(error) {

            console.error(
                "Error loading the existing project dataset:",
                error
            );

            showError(
                "Unable to load the existing project dataset. " +
                "Check the CSV filename and GitHub path."
            );
        }
    });
}

function loadWorldBankData() {

    Papa.parse(WORLD_BANK_DATA_FILE, {

        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function(results) {

            if (results.errors.length > 0) {
                console.warn(
                    "World Bank CSV parsing warnings:",
                    results.errors
                );
            }

            worldBankData = results.data
                .filter(row => {

                    return (
                        row.Economy &&
                        row["Economy Code"] &&
                        String(row.Year).trim() !== "" &&
                        Number.isFinite(Number(row.Year))
                    );

                })
                .map(row => {

                    return {
                        country: row.Economy.trim(),
                        iso3: row["Economy Code"]
                            .trim()
                            .toUpperCase(),
                        year: Number(row.Year),
                        value: row[WORLD_BANK_VALUE_COLUMN]
                    };

                });

            if (worldBankData.length === 0) {

                showError(
                    "No valid country records were found in the World Bank dataset."
                );

                return;
            }

            console.log(
                "Successfully loaded",
                worldBankData.length,
                "World Bank records"
            );

            loadPeriodPadData();
        },

        error: function(error) {

            console.error(
                "Error loading the World Bank CSV:",
                error
            );

            showError(
                "Unable to load the World Bank dataset. " +
                "Check the CSV filename and GitHub path."
            );
        }
    });
}

function loadPeriodPadData() {

    Papa.parse(PERIOD_PAD_DATA_FILE, {

        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function(results) {

            if (results.errors.length > 0) {
                console.warn(
                    "Period pad CSV parsing warnings:",
                    results.errors
                );
            }

            periodPadData = results.data
                .filter(row => {

                    return (
                        row.Economy &&
                        row["Economy Code"] &&
                        String(row.Year).trim() !== "" &&
                        Number.isFinite(Number(row.Year))
                    );

                })
                .map(row => {

                    return {
                        country: row.Economy.trim(),
                        iso3: row["Economy Code"]
                            .trim()
                            .toUpperCase(),
                        year: Number(row.Year),
                        pricePerPad: row["Price per cheapest pad (USD)"],
                        lifetimeCost:
                            row["Lifetime cost of having a period (USD)"]
                    };

                });

            if (periodPadData.length === 0) {

                showError(
                    "No valid country records were found in the period pad dataset."
                );

                return;
            }

            console.log(
                "Successfully loaded",
                periodPadData.length,
                "period pad price records"
            );

            populateCountryDropdown();
            populateYearDropdown();
            initializeDashboard();
        },

        error: function(error) {

            console.error(
                "Error loading the period pad CSV:",
                error
            );

            showError(
                "Unable to load the period pad dataset. " +
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
    const indicator =
        document.getElementById("indicator-select").value;
    const indicatorConfig =
        indicators[indicator];

    if (!indicatorConfig) {
        return;
    }

    const sourceData = getIndicatorSourceData(indicatorConfig);

    // Include only years with a value for the selected indicator.
    const years = [
        ...new Set(
            sourceData
                .filter(row => {

                    return isValidIndicatorRow(
                        row,
                        indicatorConfig
                    );
                })
                .map(row => row.year)
        )
    ].sort((a, b) => b - a);

    yearSelect.innerHTML = "";

    if (years.length === 0) {

        const option =
            document.createElement("option");

        option.value = "";
        option.textContent = "No data years available";
        yearSelect.appendChild(option);
        selectedYear = null;
        return;
    }

    // Populate the dropdown
    years.forEach(year => {

        const option =
            document.createElement("option");

        option.value = String(year);
        option.textContent = String(year);

        yearSelect.appendChild(option);
    });

    // Keep the selected year if available; otherwise use the latest year.
    selectedYear = years.includes(selectedYear)
        ? selectedYear
        : years[0];

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

    [menstrualData, worldBankData, periodPadData].forEach(sourceData => {

        sourceData.forEach(row => {

            if (!countryMap.has(row.iso3)) {
                countryMap.set(
                    row.iso3,
                    row.country
                );
            }
        });
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

        populateYearDropdown();
        updateMap();
        updateSelectedCountry();
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

function getIndicatorSourceData(indicatorConfig) {

    switch (indicatorConfig.dataSource) {
        case "worldBank":
            return worldBankData;
        case "periodPads":
            return periodPadData;
        default:
            return menstrualData;
    }
}

function isValidIndicatorRow(row, indicatorConfig) {

    const fields = [
        indicatorConfig.field,
        ...(indicatorConfig.additionalFields || [])
    ];

    return fields.every(field => {

        const value = getNumericValue(row[field]);

        return (
            value !== null &&
            value >= 0 &&
            value <= (
                indicatorConfig.maxValues?.[field] ??
                indicatorConfig.maxValue
            )
        );
    });
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

function formatCurrency(value, decimals) {

    const number = getNumericValue(value);

    if (number === null || number < 0) {
        return "No data";
    }

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}


// Get records for the currently selected year
function getYearData() {

    const indicator =
        document.getElementById("indicator-select").value;
    const indicatorConfig =
        indicators[indicator];

    if (!indicatorConfig) {
        return [];
    }

    const sourceData = getIndicatorSourceData(indicatorConfig);

    return sourceData.filter(row => {

        return row.year === selectedYear;
    });
}


// Find a country in the selected year
function findCountry(iso3, sourceData = getYearData()) {

    return sourceData.find(row => {

        return (
            row.iso3 === iso3 &&
            row.year === selectedYear
        );
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

    const projectCountry =
        findCountry(selectedCountry, menstrualData);
    const worldBankCountry =
        findCountry(selectedCountry, worldBankData);
    const periodPadCountry =
        findCountry(selectedCountry, periodPadData);

    if (!projectCountry && !worldBankCountry && !periodPadCountry) {

        showMissingCountryData();
        return;
    }

    updateCountryStats(
        projectCountry,
        worldBankCountry,
        periodPadCountry
    );
}


// ==========================================
// 10. UPDATE COUNTRY STATISTICS
// ==========================================

function updateCountryStats(
    projectCountry,
    worldBankCountry,
    periodPadCountry
) {

    document.getElementById(
        "selected-country-name"
    ).textContent =
        projectCountry?.country ||
        worldBankCountry?.country ||
        periodPadCountry?.country ||
        "Selected country";

    document.getElementById(
        "data-year"
    ).textContent =
        `Selected data year: ${selectedYear}`;

    // Existing project dataset indicators
    document.getElementById(
        "materials-value"
    ).textContent = formatPercentage(
        projectCountry?.materials_total
    );

    document.getElementById(
        "private-value"
    ).textContent = formatPercentage(
        projectCountry?.private_total
    );

    document.getElementById(
        "participation-value"
    ).textContent = formatPercentage(
        projectCountry?.participation_total
    );

    // Separately sourced World Bank indicator
    document.getElementById(
        "world-bank-materials-value"
    ).textContent = formatPercentage(
        worldBankCountry?.value
    );

    document.getElementById(
        "pad-price-value"
    ).textContent = formatCurrency(
        periodPadCountry?.pricePerPad,
        3
    );

    document.getElementById(
        "pad-lifetime-cost-value"
    ).textContent = formatCurrency(
        periodPadCountry?.lifetimeCost,
        0
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

    document.getElementById(
        "world-bank-materials-value"
    ).textContent = "--";

    document.getElementById(
        "pad-price-value"
    ).textContent = "--";

    document.getElementById(
        "pad-lifetime-cost-value"
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
        "participation-value",
        "world-bank-materials-value",
        "pad-price-value",
        "pad-lifetime-cost-value"
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
    const validCountries = yearData.filter(row =>
        isValidIndicatorRow(row, indicatorConfig)
    );

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
            row => getNumericValue(row[indicatorConfig.field])
        ),

        customdata: validCountries.map(row =>
            indicatorConfig.dataSource === "periodPads"
                ? getNumericValue(row.lifetimeCost)
                : null
        ),

        text: validCountries.map(
            row => row.country
        ),

        zmin: 0,
        zmax: indicatorConfig.maxValue,

        colorscale: [
            [0.00, "#f6e4ef"],
            [0.25, "#e7b6d0"],
            [0.50, "#cb84af"],
            [0.75, "#a65889"],
            [1.00, "#6e305c"]
        ],

        colorbar: {
            title: {
                text: indicatorConfig.currency ? "USD" : "%"
            },

            tickprefix: indicatorConfig.currency ? "$" : "",
            ticksuffix: indicatorConfig.currency ? "" : "%",
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
            (indicatorConfig.currency
                ? "Cheapest pad: $%{z:.3f}<br>" +
                    "Estimated lifetime cost: $%{customdata:,.0f}<br>"
                : indicatorConfig.label +
                    ": %{z:.1f}%<br>") +
            "Data year: " +
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
    const indicator =
        document.getElementById("indicator-select").value;
    const indicatorConfig =
        indicators[indicator];
    const sourceLabel = {
        worldBank: "World Bank",
        periodPads: "Healthnews 2024 report (IBMNC)",
        project: "Existing project dataset"
    }[indicatorConfig.dataSource];

    document.getElementById(
        "map-year-label"
    ).textContent =
        `Displaying ${selectedYear} data from ${sourceLabel}`;

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
