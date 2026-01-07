import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    userProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfileDetail",
      required: true,
      unique: true,
    },

    // BASIC
    maritalStatus: [{
      type: String,
      enum: ["UnMarried", "Divorced", "Widowed", "Separated", "Awaiting Divorce"]
    }],
    ageRange: {
      min: {
        type: Number,
        min: 18,
        max: 80,
        required: true
      },
      max: {
        type: Number,
        min: 18,
        max: 80,
        required: true,
        validate: {
          validator: function(value) {
            return value >= this.min;
          },
          message: "Max age must be greater than or equal to min age"
        }
      }
    },
    heightRange: {
      min: {
        type: Number,
        min: 100, // ~3'3"
        max: 250  // ~8'2"
      },
      max: {
        type: Number,
        min: 100,
        max: 250,
        validate: {
          validator: function(value) {
            return value >= this.min;
          },
          message: "Max height must be greater than or equal to min height"
        }
      }
    },

    // RELIGION
    religion: {
      type: String,
      enum: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Jewish", "Parsi", "No Religion", "Spiritual", "Other"]
    },
    caste: {
      type: String,
      // Caste options would depend on religion - this is a generic list
      enum: [
        // Hindu Castes
        "Brahmin", "Rajput", "Maratha", "Bania", "Yadav", "Jat", "Gurjar", "Punjabi Khatri", 
        "Bengali Brahmin", "Tamil Brahmin", "Nair", "Lingayat", "Reddy", "Vellalar", "Kamma",
        "No Bar", "Don't Care",
        
        // Muslim Castes
        "Sunni", "Shia", "Pathan", "Mughal", "Syed", "Ansari", "Siddiqui",
        
        // Christian Denominations
        "Catholic", "Protestant", "Orthodox", "Syrian Christian", "Latin Catholic",
        
        // Sikh Castes
        "Jat Sikh", "Khatri", "Arora", "Ramgarhia",
        
        // Jain Castes
        "Digambar", "Shwetambar", "Terapanthi"
      ]
    },
    motherTongue: {
      type: String,
      enum: [
        "Hindi", "Marathi", "Bengali", "Tamil", "Telugu", "Gujarati", "Punjabi", "Malayalam",
        "Kannada", "Odia", "Urdu", "English", "Sindhi", "Kashmiri", "Assamese", "Nepali",
        "Konkani", "Bhojpuri", "Rajasthani", "Haryanvi", "Other"
      ]
    },

    // CAREER
    education: {
      type: String,
      enum: [
        "High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "MBA", 
        "CA", "CS", "ICWA", "Medical - MBBS", "Engineering - BE/B.Tech", "Law - LLB", 
        "Architecture", "Fashion Designing", "Hotel Management", "Other Professional Degree"
      ]
    },
    occupation: {
      type: String,
      enum: [
        "Software Professional", "Doctor", "Engineer", "Teacher", "Professor", "CA", "Lawyer",
        "Civil Services", "Business Owner", "Manager", "Administrator", "Defense Services",
        "Banking Professional", "Financial Analyst", "Marketing Professional", "Sales Professional",
        "Consultant", "Architect", "Scientist", "Researcher", "Artist", "Designer",
        "Student", "Not Working", "Other"
      ]
    },
    salaryRange: {
      type: String,
      enum: [
        "No Income", "Below 1 LPA", "1-2 LPA", "2-3 LPA", "3-5 LPA", "5-7 LPA", "7-10 LPA",
        "10-15 LPA", "15-20 LPA", "20-25 LPA", "25-30 LPA", "30-40 LPA", "40-50 LPA",
        "50-75 LPA", "75 LPA & Above", "Not Applicable"
      ]
    },

    // LOCATION
    country: {
      type: String,
      default: "India",
      enum: [
        "India", "USA", "Canada", "UK", "Australia", "UAE", "Singapore", "Germany", 
        "France", "Other European Country", "Other Asian Country", "Other"
      ]
    },
    state: String, // Would be better with enum but too many options
    city: String,

    // LIFESTYLE
    diet: {
      type: String,
      enum: ["Vegetarian", "Eggetarian", "Non-Vegetarian", "Jain", "Vegan"]
    },
    smoking: {
      type: String,
      enum: ["Never", "Occasionally", "Regularly", "Trying to Quit"]
    },
    drinking: {
      type: String,
      enum: ["Never", "Occasionally", "Regularly", "Trying to Quit"]
    },

    // HOROSCOPE
    manglik: {
      type: String,
      enum: ["Yes", "No", "Non-Manglik", "Doesn't Matter"]
    },
    rashi: {
      type: String,
      enum: [
        "Mesh", "Vrishabh", "Mithun", "Kark", "Singh", "Kanya", "Tula", 
        "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen"
      ]
    },
    nadi: {
      type: String,
      enum: ["Adi", "Madhya", "Antya", "Doesn't Matter"]
    },
    gan: {
      type: String,
      enum: ["Dev", "Manav", "Rakshas", "Doesn't Matter"]
    },
    charan: {
      type: String,
      enum: ["1", "2", "3", "4", "Doesn't Matter"]
    },

    partnerExpectation: { 
      type: String, 
      maxlength: 500,
      validate: {
        validator: function(text) {
          return text.length <= 500;
        },
        message: "Partner expectation cannot exceed 500 characters"
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add index for better search performance
preferenceSchema.index({ religion: 1, caste: 1 });
preferenceSchema.index({ "ageRange.min": 1, "ageRange.max": 1 });
preferenceSchema.index({ country: 1, state: 1, city: 1 });

export default mongoose.model("UserPartnerPreference", preferenceSchema);