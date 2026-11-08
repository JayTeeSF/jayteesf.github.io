// Shared decoded-MP3 timeline in seconds, rounded to milliseconds (source: 44100 Hz).
// Contextual acoustic frames are about 20 ms; extra decimal places do not certify word-boundary accuracy.
// displayStart previews the verse; each word start/end independently controls emphasis.
window.CLOSING_MEDLEY = {
  "duration": 181,
  "songs": [
    {
      "title": "Trust in God",
      "artist": "Aware Worship · Mark Gutierrez",
      "start": 0,
      "motion": "rise"
    },
    {
      "title": "Never Lost",
      "artist": "CeCe Winans",
      "start": 60,
      "motion": "strong"
    },
    {
      "title": "Be Still and Know",
      "artist": "CeCe Winans",
      "start": 120,
      "motion": "settle"
    }
  ],
  "cues": [
    {
      "start": 0.121,
      "end": 3.3,
      "text": "Blessed assurance",
      "words": [
        {
          "text": "Blessed",
          "start": 0.121,
          "end": 0.54,
          "emphasis": 0.351,
          "energy": 0.135,
          "crest": 0.27,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "assurance",
          "start": 0.54,
          "end": 3.18,
          "emphasis": 0.821,
          "energy": 0.497,
          "crest": 1.06,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "rise",
      "displayStart": 0
    },
    {
      "start": 4.939,
      "end": 7.63,
      "text": "Jesus is mine",
      "words": [
        {
          "text": "Jesus",
          "start": 4.939,
          "end": 5.624,
          "emphasis": 0.804,
          "energy": 1,
          "crest": 5.37,
          "timingSource": "prior-estimate"
        },
        {
          "text": "is",
          "start": 5.624,
          "end": 6.234,
          "emphasis": 0.253,
          "energy": 0.8,
          "crest": 5.71,
          "timingSource": "prior-estimate"
        },
        {
          "text": "mine",
          "start": 6.234,
          "end": 7.51,
          "emphasis": 0.769,
          "energy": 0.391,
          "crest": 6.33,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "rise",
      "displayStart": 4.139
    },
    {
      "start": 9.545,
      "end": 17.65,
      "text": "He's been my fourth man in the fire time after time",
      "words": [
        {
          "text": "He's",
          "start": 9.545,
          "end": 10.026,
          "emphasis": 0.205,
          "energy": 0.982,
          "crest": 10.026,
          "timingSource": "mp3-context"
        },
        {
          "text": "been",
          "start": 10.026,
          "end": 10.335,
          "emphasis": 0.234,
          "energy": 1,
          "crest": 10.11,
          "timingSource": "mp3-context"
        },
        {
          "text": "my",
          "start": 10.335,
          "end": 10.766,
          "emphasis": 0.259,
          "energy": 0.828,
          "crest": 10.41,
          "timingSource": "prior-estimate"
        },
        {
          "text": "fourth",
          "start": 10.766,
          "end": 11.28,
          "emphasis": 0.777,
          "energy": 1,
          "crest": 11.02,
          "timingSource": "mp3-context"
        },
        {
          "text": "man",
          "start": 11.44,
          "end": 11.936,
          "emphasis": 0.403,
          "energy": 0.647,
          "crest": 11.71,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "in",
          "start": 12.141,
          "end": 12.526,
          "emphasis": 0.229,
          "energy": 0.806,
          "crest": 12.141,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "the",
          "start": 12.526,
          "end": 12.9,
          "emphasis": 0.228,
          "energy": 0.868,
          "crest": 12.69,
          "timingSource": "prior-estimate"
        },
        {
          "text": "fire",
          "start": 13.129,
          "end": 14.46,
          "emphasis": 0.738,
          "energy": 0.408,
          "crest": 13.38,
          "timingSource": "mp3-context"
        },
        {
          "text": "time",
          "start": 14.46,
          "end": 15.015,
          "emphasis": 0.463,
          "energy": 1,
          "crest": 14.58,
          "timingSource": "prior-estimate"
        },
        {
          "text": "after",
          "start": 15.191,
          "end": 15.4,
          "emphasis": 0.37,
          "energy": 0.462,
          "crest": 15.191,
          "timingSource": "mp3-context"
        },
        {
          "text": "time",
          "start": 15.546,
          "end": 17.53,
          "emphasis": 0.42,
          "energy": 0.384,
          "crest": 15.68,
          "timingSource": "acoustic-reviewed"
        }
      ],
      "motion": "rise",
      "displayStart": 8.745
    },
    {
      "start": 19.129,
      "end": 22.42,
      "text": "Born of His Spirit",
      "words": [
        {
          "text": "Born",
          "start": 19.129,
          "end": 19.649,
          "emphasis": 0.499,
          "energy": 1,
          "crest": 19.316,
          "timingSource": "mp3-context"
        },
        {
          "text": "of",
          "start": 19.649,
          "end": 19.919,
          "emphasis": 0.229,
          "energy": 0.725,
          "crest": 19.649,
          "timingSource": "prior-estimate"
        },
        {
          "text": "His",
          "start": 19.919,
          "end": 20.26,
          "emphasis": 0.212,
          "energy": 0.874,
          "crest": 20.0,
          "timingSource": "prior-estimate"
        },
        {
          "text": "Spirit",
          "start": 20.26,
          "end": 22.3,
          "emphasis": 0.778,
          "energy": 0.507,
          "crest": 20.48,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "rise",
      "displayStart": 18.329
    },
    {
      "start": 23.84,
      "end": 26.9,
      "text": "Washed in His blood",
      "words": [
        {
          "text": "Washed",
          "start": 23.84,
          "end": 24.378,
          "emphasis": 0.432,
          "energy": 0.665,
          "crest": 24.31,
          "timingSource": "mp3-context"
        },
        {
          "text": "in",
          "start": 24.378,
          "end": 24.601,
          "emphasis": 0.233,
          "energy": 0.99,
          "crest": 24.601,
          "timingSource": "prior-estimate"
        },
        {
          "text": "His",
          "start": 24.601,
          "end": 25.417,
          "emphasis": 0.27,
          "energy": 0.826,
          "crest": 24.84,
          "timingSource": "mp3-context"
        },
        {
          "text": "blood",
          "start": 25.417,
          "end": 26.78,
          "emphasis": 0.776,
          "energy": 0.55,
          "crest": 25.63,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "rise",
      "displayStart": 23.04
    },
    {
      "start": 28.74,
      "end": 36.33,
      "text": "And what He did for me on Calvary is more than enough",
      "words": [
        {
          "text": "And",
          "start": 28.74,
          "end": 29.052,
          "emphasis": 0.216,
          "energy": 1,
          "crest": 28.836,
          "timingSource": "mp3-context"
        },
        {
          "text": "what",
          "start": 29.052,
          "end": 29.466,
          "emphasis": 0.462,
          "energy": 0.791,
          "crest": 29.14,
          "timingSource": "prior-estimate"
        },
        {
          "text": "He",
          "start": 29.466,
          "end": 29.68,
          "emphasis": 0.176,
          "energy": 0.974,
          "crest": 29.52,
          "timingSource": "prior-estimate"
        },
        {
          "text": "did",
          "start": 29.899,
          "end": 30.255,
          "emphasis": 0.461,
          "energy": 0.793,
          "crest": 30.01,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "for",
          "start": 30.44,
          "end": 31.025,
          "emphasis": 0.225,
          "energy": 0.784,
          "crest": 30.74,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "me",
          "start": 31.025,
          "end": 31.594,
          "emphasis": 0.244,
          "energy": 1,
          "crest": 31.11,
          "timingSource": "prior-estimate"
        },
        {
          "text": "on",
          "start": 31.782,
          "end": 32.203,
          "emphasis": 0.258,
          "energy": 0.708,
          "crest": 32.203,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "Calvary",
          "start": 32.203,
          "end": 33.341,
          "emphasis": 0.78,
          "energy": 0.506,
          "crest": 32.486,
          "timingSource": "mp3-context"
        },
        {
          "text": "is",
          "start": 33.341,
          "end": 33.604,
          "emphasis": 0.164,
          "energy": 0.951,
          "crest": 33.604,
          "timingSource": "prior-estimate"
        },
        {
          "text": "more",
          "start": 33.604,
          "end": 34.3,
          "emphasis": 0.503,
          "energy": 0.949,
          "crest": 33.98,
          "timingSource": "mp3-context"
        },
        {
          "text": "than",
          "start": 34.308,
          "end": 34.499,
          "emphasis": 0.213,
          "energy": 0.652,
          "crest": 34.36,
          "timingSource": "prior-estimate"
        },
        {
          "text": "enough",
          "start": 34.499,
          "end": 36.21,
          "emphasis": 0.778,
          "energy": 0.362,
          "crest": 34.71,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "rise",
      "displayStart": 27.94
    },
    {
      "start": 37.983,
      "end": 40.15,
      "text": "So, I trust in God",
      "words": [
        {
          "text": "So,",
          "start": 37.983,
          "end": 38.355,
          "emphasis": 0.172,
          "energy": 0.59,
          "crest": 38.27,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "I",
          "start": 38.355,
          "end": 38.552,
          "emphasis": 0.242,
          "energy": 0.706,
          "crest": 38.36,
          "timingSource": "prior-estimate"
        },
        {
          "text": "trust",
          "start": 38.552,
          "end": 39.086,
          "emphasis": 0.763,
          "energy": 0.697,
          "crest": 38.71,
          "timingSource": "mp3-context"
        },
        {
          "text": "in",
          "start": 39.086,
          "end": 39.433,
          "emphasis": 0.193,
          "energy": 0.912,
          "crest": 39.433,
          "timingSource": "prior-estimate"
        },
        {
          "text": "God",
          "start": 39.433,
          "end": 40.03,
          "emphasis": 0.823,
          "energy": 0.818,
          "crest": 39.6,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "rise",
      "displayStart": 37.183
    },
    {
      "start": 41.401,
      "end": 43.805,
      "text": "My Savior",
      "words": [
        {
          "text": "My",
          "start": 41.401,
          "end": 41.561,
          "emphasis": 0.274,
          "energy": 1,
          "crest": 41.47,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "Savior",
          "start": 41.821,
          "end": 43.805,
          "emphasis": 0.862,
          "energy": 1,
          "crest": 43.12,
          "timingSource": "mp3-phrase-anchor"
        }
      ],
      "motion": "rise",
      "displayStart": 40.601
    },
    {
      "start": 43.885,
      "end": 52.31,
      "text": "The One who will never fail",
      "words": [
        {
          "text": "The",
          "start": 43.885,
          "end": 44.025,
          "emphasis": 0.253,
          "energy": 1,
          "crest": 43.885,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "One",
          "start": 44.085,
          "end": 45.1,
          "emphasis": 0.793,
          "energy": 0.755,
          "crest": 44.26,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "who",
          "start": 45.848,
          "end": 46.12,
          "emphasis": 0.269,
          "energy": 0.277,
          "crest": 45.867,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "will",
          "start": 46.249,
          "end": 46.509,
          "emphasis": 0.272,
          "energy": 1,
          "crest": 46.36,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "never",
          "start": 46.649,
          "end": 48.7,
          "emphasis": 0.877,
          "energy": 0.987,
          "crest": 48.38,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "fail",
          "start": 49.053,
          "end": 52.31,
          "emphasis": 0.935,
          "energy": 1,
          "crest": 49.87,
          "timingSource": "mp3-phrase-anchor"
        }
      ],
      "motion": "rise",
      "displayStart": 43.805
    },
    {
      "start": 53.061,
      "end": 56.952,
      "text": "He will never fail",
      "words": [
        {
          "text": "He",
          "start": 53.061,
          "end": 53.242,
          "emphasis": 0.245,
          "energy": 1,
          "crest": 53.242,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "will",
          "start": 53.302,
          "end": 53.522,
          "emphasis": 0.262,
          "energy": 1,
          "crest": 53.522,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "never",
          "start": 53.523,
          "end": 53.863,
          "emphasis": 0.815,
          "energy": 1,
          "crest": 53.863,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "fail",
          "start": 53.924,
          "end": 56.952,
          "emphasis": 0.922,
          "energy": 0.801,
          "crest": 54.95,
          "timingSource": "mp3-phrase-anchor"
        }
      ],
      "motion": "rise",
      "displayStart": 52.31
    },
    {
      "start": 57.573,
      "end": 59.418,
      "text": "I trust in God",
      "words": [
        {
          "text": "I",
          "start": 57.573,
          "end": 57.774,
          "emphasis": 0.234,
          "energy": 1,
          "crest": 57.573,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "trust",
          "start": 57.854,
          "end": 58.355,
          "emphasis": 0.828,
          "energy": 0.703,
          "crest": 57.98,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "in",
          "start": 58.416,
          "end": 58.616,
          "emphasis": 0.199,
          "energy": 0.597,
          "crest": 58.616,
          "timingSource": "mp3-phrase-anchor"
        },
        {
          "text": "God",
          "start": 58.737,
          "end": 59.298,
          "emphasis": 0.756,
          "energy": 0.223,
          "crest": 59.12,
          "timingSource": "mp3-phrase-anchor"
        }
      ],
      "motion": "rise",
      "displayStart": 56.952
    },
    {
      "start": 60.466,
      "end": 62.49,
      "text": "Miracles when You move",
      "words": [
        {
          "text": "Miracles",
          "start": 60.466,
          "end": 61.42,
          "emphasis": 0.695,
          "energy": 0.678,
          "crest": 61.07,
          "timingSource": "mp3-context"
        },
        {
          "text": "when",
          "start": 61.42,
          "end": 61.66,
          "emphasis": 0.234,
          "energy": 1,
          "crest": 61.52,
          "timingSource": "prior-estimate"
        },
        {
          "text": "You",
          "start": 61.789,
          "end": 61.86,
          "emphasis": 0.2,
          "energy": 1,
          "crest": 61.789,
          "timingSource": "mp3-context"
        },
        {
          "text": "move",
          "start": 61.929,
          "end": 62.49,
          "emphasis": 0.743,
          "energy": 0.955,
          "crest": 62.12,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "strong",
      "displayStart": 59.666
    },
    {
      "start": 62.84,
      "end": 65.46,
      "text": "Such an easy thing for You to do",
      "words": [
        {
          "text": "Such",
          "start": 62.84,
          "end": 63.1,
          "emphasis": 0.151,
          "energy": 1,
          "crest": 63.0,
          "timingSource": "prior-estimate"
        },
        {
          "text": "an",
          "start": 63.326,
          "end": 63.506,
          "emphasis": 0.214,
          "energy": 1,
          "crest": 63.47,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "easy",
          "start": 63.506,
          "end": 63.886,
          "emphasis": 0.425,
          "energy": 0.973,
          "crest": 63.59,
          "timingSource": "mp3-context"
        },
        {
          "text": "thing",
          "start": 63.886,
          "end": 64.24,
          "emphasis": 0.386,
          "energy": 0.947,
          "crest": 63.98,
          "timingSource": "mp3-context"
        },
        {
          "text": "for",
          "start": 64.244,
          "end": 64.407,
          "emphasis": 0.174,
          "energy": 1,
          "crest": 64.407,
          "timingSource": "prior-estimate"
        },
        {
          "text": "You",
          "start": 64.407,
          "end": 64.683,
          "emphasis": 0.225,
          "energy": 1,
          "crest": 64.496,
          "timingSource": "mp3-context"
        },
        {
          "text": "to",
          "start": 64.683,
          "end": 64.868,
          "emphasis": 0.206,
          "energy": 1,
          "crest": 64.868,
          "timingSource": "prior-estimate"
        },
        {
          "text": "do",
          "start": 64.868,
          "end": 65.34,
          "emphasis": 0.406,
          "energy": 0.749,
          "crest": 64.969,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "strong",
      "displayStart": 62.49
    },
    {
      "start": 66.866,
      "end": 71.98,
      "text": "Your hand is moving right now",
      "words": [
        {
          "text": "Your",
          "start": 66.866,
          "end": 67.14,
          "emphasis": 0.253,
          "energy": 1,
          "crest": 66.95,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "hand",
          "start": 67.347,
          "end": 68.37,
          "emphasis": 0.804,
          "energy": 1,
          "crest": 67.347,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "is",
          "start": 68.63,
          "end": 69.058,
          "emphasis": 0.143,
          "energy": 1,
          "crest": 68.99,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "moving",
          "start": 69.058,
          "end": 69.615,
          "emphasis": 0.8,
          "energy": 1,
          "crest": 69.12,
          "timingSource": "prior-estimate"
        },
        {
          "text": "right",
          "start": 69.793,
          "end": 70.184,
          "emphasis": 0.775,
          "energy": 1,
          "crest": 69.8,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "now",
          "start": 70.184,
          "end": 71.98,
          "emphasis": 0.773,
          "energy": 0.95,
          "crest": 70.45,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 66.066
    },
    {
      "start": 72.223,
      "end": 74.09,
      "text": "You are still showing up",
      "words": [
        {
          "text": "You",
          "start": 72.223,
          "end": 72.38,
          "emphasis": 0.207,
          "energy": 1,
          "crest": 72.3,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "are",
          "start": 72.38,
          "end": 72.62,
          "emphasis": 0.264,
          "energy": 1,
          "crest": 72.47,
          "timingSource": "prior-estimate"
        },
        {
          "text": "still",
          "start": 72.62,
          "end": 72.96,
          "emphasis": 0.735,
          "energy": 1,
          "crest": 72.94,
          "timingSource": "prior-estimate"
        },
        {
          "text": "showing",
          "start": 73.174,
          "end": 73.755,
          "emphasis": 0.444,
          "energy": 1,
          "crest": 73.29,
          "timingSource": "mp3-context"
        },
        {
          "text": "up",
          "start": 73.755,
          "end": 74.09,
          "emphasis": 0.396,
          "energy": 0.66,
          "crest": 73.82,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 71.98
    },
    {
      "start": 74.685,
      "end": 77.3,
      "text": "At the tomb of every Lazarus",
      "words": [
        {
          "text": "At",
          "start": 74.685,
          "end": 74.97,
          "emphasis": 0.196,
          "energy": 0.925,
          "crest": 74.685,
          "timingSource": "mp3-context"
        },
        {
          "text": "the",
          "start": 74.992,
          "end": 75.08,
          "emphasis": 0.166,
          "energy": 0.785,
          "crest": 75.01,
          "timingSource": "prior-estimate"
        },
        {
          "text": "tomb",
          "start": 75.08,
          "end": 75.516,
          "emphasis": 0.727,
          "energy": 1,
          "crest": 75.21,
          "timingSource": "prior-estimate"
        },
        {
          "text": "of",
          "start": 75.516,
          "end": 75.786,
          "emphasis": 0.216,
          "energy": 1,
          "crest": 75.66,
          "timingSource": "prior-estimate"
        },
        {
          "text": "every",
          "start": 75.786,
          "end": 76.0,
          "emphasis": 0.419,
          "energy": 1,
          "crest": 75.94,
          "timingSource": "prior-estimate"
        },
        {
          "text": "Lazarus",
          "start": 76.066,
          "end": 77.18,
          "emphasis": 0.792,
          "energy": 0.958,
          "crest": 76.64,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "strong",
      "displayStart": 74.09
    },
    {
      "start": 78.493,
      "end": 82.89,
      "text": "Your voice is calling me out",
      "words": [
        {
          "text": "Your",
          "start": 78.493,
          "end": 79.206,
          "emphasis": 0.237,
          "energy": 1,
          "crest": 78.61,
          "timingSource": "mp3-context"
        },
        {
          "text": "voice",
          "start": 79.206,
          "end": 80.08,
          "emphasis": 0.818,
          "energy": 1,
          "crest": 79.4,
          "timingSource": "prior-estimate"
        },
        {
          "text": "is",
          "start": 80.299,
          "end": 80.434,
          "emphasis": 0.153,
          "energy": 0.556,
          "crest": 80.434,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "calling",
          "start": 80.434,
          "end": 81.428,
          "emphasis": 0.783,
          "energy": 1,
          "crest": 80.7,
          "timingSource": "mp3-context"
        },
        {
          "text": "me",
          "start": 81.428,
          "end": 82.004,
          "emphasis": 0.201,
          "energy": 1,
          "crest": 81.6,
          "timingSource": "prior-estimate"
        },
        {
          "text": "out",
          "start": 82.004,
          "end": 82.89,
          "emphasis": 0.787,
          "energy": 0.878,
          "crest": 82.16,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 77.693
    },
    {
      "start": 83.218,
      "end": 88.78,
      "text": "And right now I know You're able",
      "words": [
        {
          "text": "And",
          "start": 83.218,
          "end": 83.433,
          "emphasis": 0.159,
          "energy": 0.976,
          "crest": 83.433,
          "timingSource": "prior-estimate"
        },
        {
          "text": "right",
          "start": 83.433,
          "end": 84.512,
          "emphasis": 0.828,
          "energy": 1,
          "crest": 83.78,
          "timingSource": "mp3-context"
        },
        {
          "text": "now",
          "start": 84.834,
          "end": 85.3,
          "emphasis": 0.832,
          "energy": 1,
          "crest": 84.98,
          "timingSource": "mp3-context"
        },
        {
          "text": "I",
          "start": 85.3,
          "end": 85.53,
          "emphasis": 0.229,
          "energy": 0.304,
          "crest": 85.3,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know",
          "start": 86.669,
          "end": 87.04,
          "emphasis": 0.816,
          "energy": 1,
          "crest": 86.84,
          "timingSource": "prior-estimate"
        },
        {
          "text": "You're",
          "start": 87.04,
          "end": 87.915,
          "emphasis": 0.225,
          "energy": 1,
          "crest": 87.64,
          "timingSource": "prior-estimate"
        },
        {
          "text": "able",
          "start": 87.915,
          "end": 88.78,
          "emphasis": 0.79,
          "energy": 1,
          "crest": 88.32,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 82.89
    },
    {
      "start": 89.032,
      "end": 95.64,
      "text": "And my God come through again",
      "words": [
        {
          "text": "And",
          "start": 89.032,
          "end": 89.16,
          "emphasis": 0.146,
          "energy": 1,
          "crest": 89.15,
          "timingSource": "prior-estimate"
        },
        {
          "text": "my",
          "start": 89.16,
          "end": 90.22,
          "emphasis": 0.311,
          "energy": 1,
          "crest": 89.85,
          "timingSource": "prior-estimate"
        },
        {
          "text": "God",
          "start": 90.723,
          "end": 91.54,
          "emphasis": 0.827,
          "energy": 1,
          "crest": 90.99,
          "timingSource": "mp3-context"
        },
        {
          "text": "come",
          "start": 92.12,
          "end": 92.644,
          "emphasis": 0.446,
          "energy": 1,
          "crest": 92.22,
          "timingSource": "prior-estimate"
        },
        {
          "text": "through",
          "start": 92.644,
          "end": 93.297,
          "emphasis": 0.241,
          "energy": 1,
          "crest": 92.92,
          "timingSource": "prior-estimate"
        },
        {
          "text": "again",
          "start": 93.297,
          "end": 95.52,
          "emphasis": 0.817,
          "energy": 1,
          "crest": 93.8,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 88.78
    },
    {
      "start": 96.54,
      "end": 100.97,
      "text": "You can do all things",
      "words": [
        {
          "text": "You",
          "start": 96.54,
          "end": 96.95,
          "emphasis": 0.234,
          "energy": 1,
          "crest": 96.82,
          "timingSource": "mp3-context"
        },
        {
          "text": "can",
          "start": 96.95,
          "end": 97.52,
          "emphasis": 0.46,
          "energy": 1,
          "crest": 97.15,
          "timingSource": "prior-estimate"
        },
        {
          "text": "do",
          "start": 97.52,
          "end": 98.014,
          "emphasis": 0.453,
          "energy": 1,
          "crest": 97.78,
          "timingSource": "mp3-context"
        },
        {
          "text": "all",
          "start": 98.014,
          "end": 99.089,
          "emphasis": 0.818,
          "energy": 1,
          "crest": 98.15,
          "timingSource": "prior-estimate"
        },
        {
          "text": "things",
          "start": 99.089,
          "end": 100.85,
          "emphasis": 0.898,
          "energy": 1,
          "crest": 99.19,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 95.74
    },
    {
      "start": 102.453,
      "end": 107.45,
      "text": "You can do all things but fail",
      "words": [
        {
          "text": "You",
          "start": 102.453,
          "end": 102.916,
          "emphasis": 0.215,
          "energy": 1,
          "crest": 102.52,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "can",
          "start": 102.916,
          "end": 103.436,
          "emphasis": 0.438,
          "energy": 1,
          "crest": 102.98,
          "timingSource": "prior-estimate"
        },
        {
          "text": "do",
          "start": 103.436,
          "end": 104.38,
          "emphasis": 0.424,
          "energy": 1,
          "crest": 103.99,
          "timingSource": "prior-estimate"
        },
        {
          "text": "all",
          "start": 104.38,
          "end": 105.436,
          "emphasis": 0.889,
          "energy": 1,
          "crest": 104.88,
          "timingSource": "prior-estimate"
        },
        {
          "text": "things",
          "start": 105.436,
          "end": 106.298,
          "emphasis": 0.827,
          "energy": 1,
          "crest": 105.46,
          "timingSource": "prior-estimate"
        },
        {
          "text": "but",
          "start": 106.298,
          "end": 106.72,
          "emphasis": 0.235,
          "energy": 1,
          "crest": 106.42,
          "timingSource": "prior-estimate"
        },
        {
          "text": "fail",
          "start": 106.72,
          "end": 107.45,
          "emphasis": 0.78,
          "energy": 1,
          "crest": 106.95,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 101.653
    },
    {
      "start": 107.75,
      "end": 109.82,
      "text": "'Cause You've never lost a battle",
      "words": [
        {
          "text": "'Cause",
          "start": 107.75,
          "end": 108.06,
          "emphasis": 0.456,
          "energy": 1,
          "crest": 107.87,
          "timingSource": "prior-estimate"
        },
        {
          "text": "You've",
          "start": 108.06,
          "end": 108.283,
          "emphasis": 0.195,
          "energy": 1,
          "crest": 108.283,
          "timingSource": "prior-estimate"
        },
        {
          "text": "never",
          "start": 108.283,
          "end": 108.784,
          "emphasis": 0.809,
          "energy": 1,
          "crest": 108.784,
          "timingSource": "mp3-context"
        },
        {
          "text": "lost",
          "start": 108.784,
          "end": 109.14,
          "emphasis": 0.776,
          "energy": 1,
          "crest": 108.87,
          "timingSource": "mp3-context"
        },
        {
          "text": "a",
          "start": 109.14,
          "end": 109.265,
          "emphasis": 0.192,
          "energy": 1,
          "crest": 109.265,
          "timingSource": "prior-estimate"
        },
        {
          "text": "battle",
          "start": 109.265,
          "end": 109.82,
          "emphasis": 0.797,
          "energy": 1,
          "crest": 109.32,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "strong",
      "displayStart": 107.45
    },
    {
      "start": 110.15,
      "end": 112.431,
      "text": "No, You've never lost a battle",
      "words": [
        {
          "text": "No,",
          "start": 110.15,
          "end": 110.56,
          "emphasis": 0.279,
          "energy": 1,
          "crest": 110.27,
          "timingSource": "prior-estimate"
        },
        {
          "text": "You've",
          "start": 110.56,
          "end": 110.94,
          "emphasis": 0.23,
          "energy": 1,
          "crest": 110.74,
          "timingSource": "prior-estimate"
        },
        {
          "text": "never",
          "start": 110.94,
          "end": 111.324,
          "emphasis": 0.816,
          "energy": 1,
          "crest": 111.29,
          "timingSource": "prior-estimate"
        },
        {
          "text": "lost",
          "start": 111.324,
          "end": 111.62,
          "emphasis": 0.787,
          "energy": 1,
          "crest": 111.324,
          "timingSource": "prior-estimate"
        },
        {
          "text": "a",
          "start": 111.62,
          "end": 112.0,
          "emphasis": 0.166,
          "energy": 1,
          "crest": 111.77,
          "timingSource": "prior-estimate"
        },
        {
          "text": "battle",
          "start": 112.0,
          "end": 112.431,
          "emphasis": 0.779,
          "energy": 0.501,
          "crest": 112.0,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 109.82
    },
    {
      "start": 112.431,
      "end": 115.308,
      "text": "And I know, I know",
      "words": [
        {
          "text": "And",
          "start": 112.431,
          "end": 112.651,
          "emphasis": 0.146,
          "energy": 0.409,
          "crest": 112.51,
          "timingSource": "prior-estimate"
        },
        {
          "text": "I",
          "start": 112.651,
          "end": 113.198,
          "emphasis": 0.226,
          "energy": 1,
          "crest": 112.88,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know,",
          "start": 113.198,
          "end": 113.87,
          "emphasis": 0.822,
          "energy": 1,
          "crest": 113.39,
          "timingSource": "mp3-context"
        },
        {
          "text": "I",
          "start": 114.276,
          "end": 114.978,
          "emphasis": 0.232,
          "energy": 1,
          "crest": 114.78,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know",
          "start": 114.978,
          "end": 115.308,
          "emphasis": 0.81,
          "energy": 0.859,
          "crest": 114.98,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 112.431
    },
    {
      "start": 115.614,
      "end": 119.03,
      "text": "You never will",
      "words": [
        {
          "text": "You",
          "start": 115.614,
          "end": 115.847,
          "emphasis": 0.235,
          "energy": 0.68,
          "crest": 115.68,
          "timingSource": "mp3-context"
        },
        {
          "text": "never",
          "start": 115.847,
          "end": 116.68,
          "emphasis": 0.85,
          "energy": 1,
          "crest": 116.33,
          "timingSource": "prior-estimate"
        },
        {
          "text": "will",
          "start": 116.68,
          "end": 118.91,
          "emphasis": 0.339,
          "energy": 1,
          "crest": 116.68,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "strong",
      "displayStart": 115.308
    },
    {
      "start": 120.21,
      "end": 121.74,
      "text": "How many know He's faithful?",
      "words": [
        {
          "text": "How",
          "start": 120.21,
          "end": 120.435,
          "emphasis": 0.142,
          "energy": 0.228,
          "crest": 120.33,
          "timingSource": "prior-estimate"
        },
        {
          "text": "many",
          "start": 120.435,
          "end": 120.62,
          "emphasis": 0.133,
          "energy": 0.379,
          "crest": 120.61,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know",
          "start": 120.62,
          "end": 120.72,
          "emphasis": 0.689,
          "energy": 0.673,
          "crest": 120.64,
          "timingSource": "prior-estimate"
        },
        {
          "text": "He's",
          "start": 120.72,
          "end": 120.94,
          "emphasis": 0.161,
          "energy": 0.453,
          "crest": 120.81,
          "timingSource": "prior-estimate"
        },
        {
          "text": "faithful?",
          "start": 120.94,
          "end": 121.62,
          "emphasis": 0.712,
          "energy": 0.468,
          "crest": 121.35,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "settle",
      "displayStart": 119.41
    },
    {
      "start": 127.68,
      "end": 132.58,
      "text": "I have faced many mountains",
      "words": [
        {
          "text": "I",
          "start": 127.68,
          "end": 128.357,
          "emphasis": 0.27,
          "energy": 1,
          "crest": 127.9,
          "timingSource": "prior-estimate"
        },
        {
          "text": "have",
          "start": 128.357,
          "end": 129.116,
          "emphasis": 0.504,
          "energy": 1,
          "crest": 128.79,
          "timingSource": "prior-estimate"
        },
        {
          "text": "faced",
          "start": 129.116,
          "end": 129.89,
          "emphasis": 0.444,
          "energy": 0.873,
          "crest": 129.25,
          "timingSource": "mp3-context"
        },
        {
          "text": "many",
          "start": 130.157,
          "end": 130.501,
          "emphasis": 0.2,
          "energy": 0.849,
          "crest": 130.22,
          "timingSource": "mp3-context"
        },
        {
          "text": "mountains",
          "start": 130.692,
          "end": 132.58,
          "emphasis": 0.77,
          "energy": 0.735,
          "crest": 130.74,
          "timingSource": "acoustic-reviewed"
        }
      ],
      "motion": "settle",
      "displayStart": 126.88
    },
    {
      "start": 132.62,
      "end": 134.38,
      "text": "Been through trials",
      "words": [
        {
          "text": "Been",
          "start": 132.62,
          "end": 133.036,
          "emphasis": 0.188,
          "energy": 0.953,
          "crest": 132.65,
          "timingSource": "prior-estimate"
        },
        {
          "text": "through",
          "start": 133.036,
          "end": 133.486,
          "emphasis": 0.179,
          "energy": 0.788,
          "crest": 133.18,
          "timingSource": "prior-estimate"
        },
        {
          "text": "trials",
          "start": 133.486,
          "end": 134.38,
          "emphasis": 0.785,
          "energy": 1,
          "crest": 133.67,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 132.58
    },
    {
      "start": 134.662,
      "end": 137.63,
      "text": "And shed many tears",
      "words": [
        {
          "text": "And",
          "start": 134.662,
          "end": 135.023,
          "emphasis": 0.228,
          "energy": 0.735,
          "crest": 134.798,
          "timingSource": "mp3-context"
        },
        {
          "text": "shed",
          "start": 135.023,
          "end": 135.71,
          "emphasis": 0.438,
          "energy": 0.921,
          "crest": 135.16,
          "timingSource": "mp3-context"
        },
        {
          "text": "many",
          "start": 135.956,
          "end": 136.504,
          "emphasis": 0.205,
          "energy": 0.905,
          "crest": 136.07,
          "timingSource": "prior-estimate"
        },
        {
          "text": "tears",
          "start": 136.504,
          "end": 137.51,
          "emphasis": 0.731,
          "energy": 0.514,
          "crest": 136.79,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 134.38
    },
    {
      "start": 138.46,
      "end": 143.77,
      "text": "When I look around and it all seems hopeless",
      "words": [
        {
          "text": "When",
          "start": 138.46,
          "end": 138.876,
          "emphasis": 0.201,
          "energy": 1,
          "crest": 138.57,
          "timingSource": "prior-estimate"
        },
        {
          "text": "I",
          "start": 138.982,
          "end": 139.022,
          "emphasis": 0.21,
          "energy": 1,
          "crest": 139.022,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "look",
          "start": 139.022,
          "end": 139.382,
          "emphasis": 0.388,
          "energy": 0.666,
          "crest": 139.38,
          "timingSource": "mp3-context"
        },
        {
          "text": "around",
          "start": 139.382,
          "end": 139.94,
          "emphasis": 0.474,
          "energy": 1,
          "crest": 139.58,
          "timingSource": "mp3-context"
        },
        {
          "text": "and",
          "start": 140.604,
          "end": 140.882,
          "emphasis": 0.234,
          "energy": 0.87,
          "crest": 140.604,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "it",
          "start": 140.882,
          "end": 141.045,
          "emphasis": 0.236,
          "energy": 1,
          "crest": 141.01,
          "timingSource": "prior-estimate"
        },
        {
          "text": "all",
          "start": 141.045,
          "end": 141.702,
          "emphasis": 0.79,
          "energy": 0.995,
          "crest": 141.06,
          "timingSource": "prior-estimate"
        },
        {
          "text": "seems",
          "start": 141.906,
          "end": 142.405,
          "emphasis": 0.394,
          "energy": 0.748,
          "crest": 142.405,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "hopeless",
          "start": 142.405,
          "end": 143.65,
          "emphasis": 0.764,
          "energy": 0.86,
          "crest": 142.97,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 137.66
    },
    {
      "start": 144.705,
      "end": 147.53,
      "text": "I won't fear",
      "words": [
        {
          "text": "I",
          "start": 144.705,
          "end": 144.874,
          "emphasis": 0.192,
          "energy": 1,
          "crest": 144.705,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "won't",
          "start": 144.874,
          "end": 145.325,
          "emphasis": 0.752,
          "energy": 1,
          "crest": 145.09,
          "timingSource": "prior-estimate"
        },
        {
          "text": "fear",
          "start": 145.325,
          "end": 147.53,
          "emphasis": 0.763,
          "energy": 0.801,
          "crest": 147.42,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "settle",
      "displayStart": 143.905
    },
    {
      "start": 147.734,
      "end": 151.63,
      "text": "I won't fear",
      "words": [
        {
          "text": "I",
          "start": 147.734,
          "end": 147.774,
          "emphasis": 0.228,
          "energy": 1,
          "crest": 147.734,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "won't",
          "start": 147.894,
          "end": 148.54,
          "emphasis": 0.818,
          "energy": 1,
          "crest": 148.03,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "fear",
          "start": 148.607,
          "end": 151.51,
          "emphasis": 0.755,
          "energy": 0.709,
          "crest": 148.7,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 147.53
    },
    {
      "start": 152.7,
      "end": 155.25,
      "text": "I'll be still and know",
      "words": [
        {
          "text": "I'll",
          "start": 152.7,
          "end": 152.775,
          "emphasis": 0.15,
          "energy": 0.673,
          "crest": 152.7,
          "timingSource": "prior-estimate"
        },
        {
          "text": "be",
          "start": 152.775,
          "end": 153.157,
          "emphasis": 0.28,
          "energy": 1,
          "crest": 152.85,
          "timingSource": "prior-estimate"
        },
        {
          "text": "still",
          "start": 153.157,
          "end": 153.857,
          "emphasis": 0.767,
          "energy": 1,
          "crest": 153.34,
          "timingSource": "mp3-context"
        },
        {
          "text": "and",
          "start": 153.857,
          "end": 154.258,
          "emphasis": 0.315,
          "energy": 1,
          "crest": 153.9,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know",
          "start": 154.258,
          "end": 155.25,
          "emphasis": 0.833,
          "energy": 1,
          "crest": 154.43,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 151.9
    },
    {
      "start": 155.704,
      "end": 158.22,
      "text": "Know You are God",
      "words": [
        {
          "text": "Know",
          "start": 155.704,
          "end": 156.0,
          "emphasis": 0.82,
          "energy": 1,
          "crest": 155.78,
          "timingSource": "mp3-context"
        },
        {
          "text": "You",
          "start": 156.244,
          "end": 156.596,
          "emphasis": 0.265,
          "energy": 1,
          "crest": 156.54,
          "timingSource": "mp3-context"
        },
        {
          "text": "are",
          "start": 156.825,
          "end": 157.275,
          "emphasis": 0.3,
          "energy": 1,
          "crest": 156.825,
          "timingSource": "mp3-context"
        },
        {
          "text": "God",
          "start": 157.275,
          "end": 158.22,
          "emphasis": 0.836,
          "energy": 1,
          "crest": 157.34,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "settle",
      "displayStart": 155.25
    },
    {
      "start": 158.684,
      "end": 161.47,
      "text": "You're right here with me",
      "words": [
        {
          "text": "You're",
          "start": 158.684,
          "end": 159.23,
          "emphasis": 0.287,
          "energy": 1,
          "crest": 158.74,
          "timingSource": "mp3-context"
        },
        {
          "text": "right",
          "start": 159.23,
          "end": 159.716,
          "emphasis": 0.81,
          "energy": 1,
          "crest": 159.24,
          "timingSource": "prior-estimate"
        },
        {
          "text": "here",
          "start": 159.716,
          "end": 160.216,
          "emphasis": 0.792,
          "energy": 1,
          "crest": 159.73,
          "timingSource": "prior-estimate"
        },
        {
          "text": "with",
          "start": 160.216,
          "end": 160.686,
          "emphasis": 0.262,
          "energy": 1,
          "crest": 160.24,
          "timingSource": "prior-estimate"
        },
        {
          "text": "me",
          "start": 160.686,
          "end": 161.47,
          "emphasis": 0.265,
          "energy": 0.828,
          "crest": 160.805,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 158.22
    },
    {
      "start": 161.62,
      "end": 164.13,
      "text": "Through all my troubles",
      "words": [
        {
          "text": "Through",
          "start": 161.62,
          "end": 162.219,
          "emphasis": 0.244,
          "energy": 1,
          "crest": 162.17,
          "timingSource": "prior-estimate"
        },
        {
          "text": "all",
          "start": 162.219,
          "end": 162.808,
          "emphasis": 0.857,
          "energy": 1,
          "crest": 162.25,
          "timingSource": "prior-estimate"
        },
        {
          "text": "my",
          "start": 162.808,
          "end": 163.041,
          "emphasis": 0.226,
          "energy": 1,
          "crest": 162.85,
          "timingSource": "prior-estimate"
        },
        {
          "text": "troubles",
          "start": 163.041,
          "end": 164.13,
          "emphasis": 0.834,
          "energy": 1,
          "crest": 163.34,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 161.47
    },
    {
      "start": 164.536,
      "end": 167.11,
      "text": "I'll be still and know",
      "words": [
        {
          "text": "I'll",
          "start": 164.536,
          "end": 164.588,
          "emphasis": 0.253,
          "energy": 1,
          "crest": 164.588,
          "timingSource": "prior-estimate"
        },
        {
          "text": "be",
          "start": 164.588,
          "end": 164.968,
          "emphasis": 0.259,
          "energy": 0.885,
          "crest": 164.77,
          "timingSource": "mp3-context"
        },
        {
          "text": "still",
          "start": 164.968,
          "end": 165.764,
          "emphasis": 0.77,
          "energy": 1,
          "crest": 165.47,
          "timingSource": "mp3-context"
        },
        {
          "text": "and",
          "start": 165.764,
          "end": 166.071,
          "emphasis": 0.316,
          "energy": 1,
          "crest": 166.071,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know",
          "start": 166.071,
          "end": 167.11,
          "emphasis": 0.83,
          "energy": 0.875,
          "crest": 166.46,
          "timingSource": "mp3-context"
        }
      ],
      "motion": "settle",
      "displayStart": 164.13
    },
    {
      "start": 167.48,
      "end": 170.02,
      "text": "Know You are God",
      "words": [
        {
          "text": "Know",
          "start": 167.48,
          "end": 167.864,
          "emphasis": 0.815,
          "energy": 1,
          "crest": 167.6,
          "timingSource": "mp3-context"
        },
        {
          "text": "You",
          "start": 168.001,
          "end": 168.6,
          "emphasis": 0.256,
          "energy": 1,
          "crest": 168.51,
          "timingSource": "mp3-context"
        },
        {
          "text": "are",
          "start": 168.6,
          "end": 169.196,
          "emphasis": 0.305,
          "energy": 1,
          "crest": 169.14,
          "timingSource": "prior-estimate"
        },
        {
          "text": "God",
          "start": 169.196,
          "end": 170.02,
          "emphasis": 0.834,
          "energy": 1.0,
          "crest": 169.52,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "settle",
      "displayStart": 167.11
    },
    {
      "start": 170.446,
      "end": 175.75,
      "text": "You are the light and rest for my soul",
      "words": [
        {
          "text": "You",
          "start": 170.446,
          "end": 170.887,
          "emphasis": 0.222,
          "energy": 1,
          "crest": 170.523,
          "timingSource": "mp3-context"
        },
        {
          "text": "are",
          "start": 171.026,
          "end": 171.56,
          "emphasis": 0.332,
          "energy": 1,
          "crest": 171.026,
          "timingSource": "mp3-context"
        },
        {
          "text": "the",
          "start": 171.56,
          "end": 171.8,
          "emphasis": 0.262,
          "energy": 1,
          "crest": 171.71,
          "timingSource": "prior-estimate"
        },
        {
          "text": "light",
          "start": 171.868,
          "end": 172.52,
          "emphasis": 0.807,
          "energy": 1,
          "crest": 171.92,
          "timingSource": "mp3-context"
        },
        {
          "text": "and",
          "start": 172.946,
          "end": 173.384,
          "emphasis": 0.255,
          "energy": 0.869,
          "crest": 172.946,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "rest",
          "start": 173.384,
          "end": 173.85,
          "emphasis": 0.768,
          "energy": 0.768,
          "crest": 173.41,
          "timingSource": "prior-estimate"
        },
        {
          "text": "for",
          "start": 173.862,
          "end": 174.295,
          "emphasis": 0.263,
          "energy": 1,
          "crest": 173.92,
          "timingSource": "prior-estimate"
        },
        {
          "text": "my",
          "start": 174.388,
          "end": 174.84,
          "emphasis": 0.256,
          "energy": 1,
          "crest": 174.43,
          "timingSource": "acoustic-reviewed"
        },
        {
          "text": "soul",
          "start": 174.84,
          "end": 175.75,
          "emphasis": 0.777,
          "energy": 0.919,
          "crest": 174.96,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "settle",
      "displayStart": 170.02
    },
    {
      "start": 176.396,
      "end": 180.89,
      "text": "You're God and I'll be still and know",
      "words": [
        {
          "text": "You're",
          "start": 176.396,
          "end": 176.894,
          "emphasis": 0.266,
          "energy": 1,
          "crest": 176.894,
          "timingSource": "prior-estimate"
        },
        {
          "text": "God",
          "start": 176.894,
          "end": 177.36,
          "emphasis": 0.833,
          "energy": 1,
          "crest": 176.961,
          "timingSource": "mp3-context"
        },
        {
          "text": "and",
          "start": 177.36,
          "end": 177.86,
          "emphasis": 0.263,
          "energy": 1,
          "crest": 177.66,
          "timingSource": "prior-estimate"
        },
        {
          "text": "I'll",
          "start": 177.86,
          "end": 178.73,
          "emphasis": 0.27,
          "energy": 0.893,
          "crest": 177.86,
          "timingSource": "prior-estimate"
        },
        {
          "text": "be",
          "start": 179.434,
          "end": 179.54,
          "emphasis": 0.169,
          "energy": 0.598,
          "crest": 179.434,
          "timingSource": "prior-estimate"
        },
        {
          "text": "still",
          "start": 179.54,
          "end": 180.3,
          "emphasis": 0.673,
          "energy": 0.337,
          "crest": 179.55,
          "timingSource": "prior-estimate"
        },
        {
          "text": "and",
          "start": 180.3,
          "end": 180.62,
          "emphasis": 0.153,
          "energy": 0.175,
          "crest": 180.45,
          "timingSource": "prior-estimate"
        },
        {
          "text": "know",
          "start": 180.62,
          "end": 180.77,
          "emphasis": 0.671,
          "energy": 0.082,
          "crest": 180.62,
          "timingSource": "prior-estimate"
        }
      ],
      "motion": "settle",
      "displayStart": 175.75
    }
  ]
};
