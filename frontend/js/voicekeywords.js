(function () {
  "use strict";

  const KEYWORD_DICTIONARY = {
    english: {
      label: "English",
      primary: [
        "sos", "help", "emergency", "accident",
        "save me", "help me", "call ambulance",
        "i need help", "please help", "call 911",
        "call police", "call doctor", "i am hurt",
        "i am injured", "danger", "fire", "attack",
      ],
      variations: [
        "helo", "hellp", "halp", "emergancy",
        "emergenci", "sos sos", "help help",
        "plz help", "pls help", "somebody help",
        "anyone help", "need ambulance",
      ],
    },

    hindi: {
      label: "Hindi (हिंदी)",
      primary: [
        "bachao",
        "madad",
        "madad karo",
        "bachao mujhe",
        "help karo",
        "emergency hai",
        "ambulance bulao",
        "police bulao",
        "doctor bulao",
        "dard ho raha hai",
        "accident ho gaya",
        "mujhe bachao",
        "koi hai",
        "koi to aao",
        "uthao mujhe",
      ],
      variations: [
        "bacho", "bachoo", "madat", "madat karo",
        "bachav", "bacha lo", "bacha lo mujhe",
        "ambulance lao", "emergency",
        "help chahiye", "help kijiye",
      ],
    },

    telugu: {
      label: "Telugu (తెలుగు)",
      primary: [
        "sahayam",
        "sahayam cheyyi",
        "pramadam",
        "aapada",
        "ambulance pampinchu",
        "naku sahayam kavali",
        "police ki cheppandi",
        "doctor ni pillandi",
        "nenu hurt ayanu",
        "accident jarigindi",
        "rakshimpu",
        "vaddu vaddu",
      ],
      variations: [
        "sahaayam", "sahayam cheseyyi", "pramaadam",
        "apada", "rakshimchi", "ambulance pampu",
        "sahayam kavali", "help cheyyi",
      ],
    },

    tamil: {
      label: "Tamil (தமிழ்)",
      primary: [
        "uthavi",
        "uthavi seyyungal",
        "avasaram",
        "kaapattungal",
        "ambulance anupungal",
        "police ku sollungal",
        "doctor ku phone seyyungal",
        "enakku help vennum",
        "accident aachi",
        "naan kaayal patten",
        "aapathu",
        "thookungal",
      ],
      variations: [
        "uthaavi", "uthaví", "kaapadu", "kaapaatrungal",
        "help pannungal", "help vennum", "avasara",
        "ambulance", "emergency", "padam",
      ],
    },

    kannada: {
      label: "Kannada (ಕನ್ನಡ)",
      primary: [
        "sahaaya",
        "sahaaya maadi",
        "nerevu",
        "apaaya",
        "ambulance kareyiri",
        "police ge heli",
        "doctor kareyiri",
        "nanage sahaaya beku",
        "accident aagide",
        "nanu gaaligoppattiddhene",
        "rakshisi",
        "yaaru iddira",
      ],
      variations: [
        "sahaya", "sahaay", "neravu", "apaaye",
        "help maadi", "help beku", "ambulance",
        "emergency ide", "nerevu kodi",
      ],
    },

    malayalam: {
      label: "Malayalam (മലയാളം)",
      primary: [
        "sahaayam",
        "sahaayam cheyyoo",
        "rakshikkoo",
        "apadam",
        "ambulance vilicho",
        "police ne vilicho",
        "doctor ne vilicho",
        "enikku sahaayam venam",
        "accident undaayi",
        "njaan vayikku patty",
        "aaraanengilum undo",
        "rakshapadam",
      ],
      variations: [
        "sahaayom", "rakshikku", "rakshikko",
        "sahaayam veno", "help cheyyoo", "help venam",
        "ambulance", "emergency", "aapathth",
      ],
    },

    bengali: {
      label: "Bengali (বাংলা)",
      primary: [
        "bachao",
        "sahajjo koro",
        "bipad",
        "ambulance dao",
        "police dao",
        "doctor dao",
        "amar sahajjo chai",
        "accident hoyeche",
        "ami aahat",
        "keu aacho",
        "raksha koro",
      ],
      variations: [
        "bachav", "bacho", "sahajjo", "bipadh",
        "help koro", "ambulance", "emergency",
        "amar help chai",
      ],
    },

    marathi: {
      label: "Marathi (मराठी)",
      primary: [
        "vachva",
        "madad kara",
        "sos",
        "prakaraniya",
        "ambulance bolvaa",
        "police bolvaa",
        "doctor bolvaa",
        "mala madad havi",
        "accident zale",
        "mala dukh hote",
        "vachva mala",
        "koni aahe ka",
      ],
      variations: [
        "bachva", "vachav", "madat kara", "madat",
        "help kara", "ambulance", "emergency",
        "mala help havi",
      ],
    },

    gujarati: {
      label: "Gujarati (ગુજરાતી)",
      primary: [
        "bachavo",
        "madad karo",
        "jokhm",
        "ambulance bolavo",
        "police bolavo",
        "doctor bolavo",
        "mane madad joi",
        "accident thayun",
        "huu hurt thayo",
        "koi che ke",
        "bachavvo",
      ],
      variations: [
        "bachao", "bachav", "madat karo", "madat",
        "help karo", "ambulance", "emergency",
        "madad joi che",
      ],
    },

    punjabi: {
      label: "Punjabi (ਪੰਜਾਬੀ)",
      primary: [
        "bachaao",
        "madad karo",
        "khatara",
        "ambulance bulaao",
        "police bulaao",
        "doctor bulaao",
        "mainu madad chahidi",
        "accident ho gaya",
        "main zaakhmi aa",
        "koi hai",
        "bachao",
      ],
      variations: [
        "bachao", "bacha lo", "madat karo",
        "help karo", "ambulance", "emergency",
        "madad chahidi",
      ],
    },

    urdu: {
      label: "Urdu (اردو)",
      primary: [
        "bachao",
        "madad karo",
        "khatara",
        "ambulance bulaao",
        "police bulaao",
        "doctor bulaao",
        "mujhe madad chahiye",
        "haadsa ho gaya",
        "mujhe takleef hai",
        "koi hai",
        "bachao mujhe",
      ],
      variations: [
        "bacho", "bachav", "madad", "imdad karo",
        "help karo", "ambulance", "emergency",
      ],
    },

    odia: {
      label: "Odia (ଓଡ଼ିଆ)",
      primary: [
        "raksha kara",
        "sahayya kara",
        "bipada",
        "ambulance ana",
        "police ku kaho",
        "doctor ana",
        "mo sahayya darkar",
        "accident heigala",
        "mu aahat",
      ],
      variations: [
        "rakhsha kara", "sahaya kara", "bipad",
        "help kara", "ambulance", "emergency",
      ],
    },
  };

  const ALL_KEYWORDS = [];
  const KEYWORD_TO_LANG = {};

  Object.entries(KEYWORD_DICTIONARY).forEach(function ([langKey, langData]) {
    var allWords = langData.primary.concat(langData.variations);

    allWords.forEach(function (word) {
      var lower = word.toLowerCase().trim();

      if (!ALL_KEYWORDS.includes(lower)) {
        ALL_KEYWORDS.push(lower);
        KEYWORD_TO_LANG[lower] = langData.label;
      }
    });
  });

  function detectEmergencyKeyword(transcript) {
    if (!transcript || typeof transcript !== "string") {
      return null;
    }

    var lower = transcript.toLowerCase().trim();

    for (var i = 0; i < ALL_KEYWORDS.length; i++) {
      var kw = ALL_KEYWORDS[i];

      if (lower.includes(kw)) {
        return {
          keyword: kw,
          language: KEYWORD_TO_LANG[kw] || "Unknown",
          transcript: transcript,
        };
      }
    }

    return null;
  }

  window.RoadSosKeywords = {
    detect: detectEmergencyKeyword,
    dictionary: KEYWORD_DICTIONARY,
    allKeywords: ALL_KEYWORDS,
    total: ALL_KEYWORDS.length,

    getLanguageKeywords: function (langKey) {
      var lang = KEYWORD_DICTIONARY[langKey];

      if (!lang) return [];

      return lang.primary.concat(lang.variations);
    },

    getSupportedLanguages: function () {
      return Object.entries(KEYWORD_DICTIONARY).map(function ([key, val]) {
        return {
          key: key,
          label: val.label,
          count: val.primary.length + val.variations.length,
        };
      });
    },
  };

})();