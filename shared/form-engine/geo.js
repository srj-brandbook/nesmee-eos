const COUNTRIES = [
  { value: "India", label: "India" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "United States", label: "United States" },
  { value: "China", label: "China" },
  { value: "Vietnam", label: "Vietnam" },
  { value: "Bangladesh", label: "Bangladesh" },
  { value: "Turkey", label: "Turkey" },
  { value: "Germany", label: "Germany" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Singapore", label: "Singapore" },
];

const STATES_BY_COUNTRY = {
  India: [
    "Andhra Pradesh",
    "Delhi",
    "Gujarat",
    "Haryana",
    "Karnataka",
    "Maharashtra",
    "Tamil Nadu",
    "Telangana",
    "Uttar Pradesh",
    "West Bengal",
  ],
  "United Arab Emirates": ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"],
  "United States": ["California", "New York", "Texas", "Illinois", "Washington"],
};

function countryOptions() {
  return COUNTRIES.map((item) => ({ value: item.value, label: item.label }));
}

function stateOptions(country) {
  const states = STATES_BY_COUNTRY[country] || [];
  return states.map((value) => ({ value, label: value }));
}

module.exports = { COUNTRIES, STATES_BY_COUNTRY, countryOptions, stateOptions };
