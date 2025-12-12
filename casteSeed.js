import mongoose from "mongoose";
import Caste from "./src/models/casteSchemaModel.js";

const castes = [

  // -------------------------
  // North Indian Castes
  // -------------------------
  "Brahmin",
  "Brahmin Gaur",
  "Brahmin Saraswat",
  "Brahmin Kanyakubj",
  "Brahmin Bhumihar",
  "Brahmin Sanadya",
  "Rajput",
  "Rajput Chauhan",
  "Rajput Rathore",
  "Rajput Sisodia",
  "Rajput Tomar",
  "Kayastha",
  "Khatri",
  "Arora",
  "Agarwal",
  "Baniya",
  "Gupta",
  "Lohia",
  "Maheshwari",
  "Oswal",
  "Jat",
  "Yadav",
  "Kurmi",

  // -------------------------
  // Marathi / Maharashtra Castes
  // -------------------------
  "Maratha",
  "96 Kuli Maratha",
  "Kunbi",
  "Bhandari",
  "Mali",
  "Gurav",
  "Teli",
  "Lohar",
  "Sutar",
  "Nhavi",
  "Agri",
  "Koli",
  "Koli Mahadev",
  "Dhangar",
  "Lingayat (Maharashtra)",
  "Brahmin Deshastha",
  "Brahmin Kokanastha",
  "Brahmin Karhade",

  // -------------------------
  // South Indian Castes (Tamil / Telugu / Kannada / Kerala)
  // -------------------------
  "Iyer",
  "Iyengar",
  "Brahmin Iyengar",
  "Brahmin Iyer",
  "Chettiar",
  "Naidu",
  "Reddy",
  "Kamma",
  "Kapu",
  "Vanniyar",
  "Mudaliar",
  "Gounder",
  "Nadar",
  "Pillai",
  "Thevar",
  "Yadava (South)",
  "Vishwakarma",
  "Carpenter",
  "Goldsmith",
  "Kuruba",
  "Lingayat",

  // -------------------------
  // Gujarati Castes
  // -------------------------
  "Patel",
  "Leva Patel",
  "Kadva Patel",
  "Modh Baniya",
  "Lohana",
  "Brahmin Gujarati",
  "Brahmbhatt",
  "Jain",
  "Jain Visha",
  "Jain Shwetambar",
  "Jain Digambar",
  "Suthar",
  "Kumbhar",

  // -------------------------
  // Rajasthan
  // -------------------------
  "Rajput (Rajasthan)",
  "Bishnoi",
  "Jat (Rajasthan)",
  "Vaishnav",
  "Maheshwari (Rajasthan)",

  // -------------------------
  // Punjab / Haryana
  // -------------------------
  "Jat Sikh",
  "Arora Sikh",
  "Ramgarhia",
  "Saini",
  "Kamboj",

  // -------------------------
  // Bengal / Odisha / Assam / North-East
  // -------------------------
  "Bengali Brahmin",
  "Bengali Kayastha",
  "Baishya",
  "Sadgop",
  "Mahishya",
  "Khandayat",
  "Karana",
  "Ahom",
  "Mishing",
  "Bodo",
  "Santhal",

  // -------------------------
  // Scheduled Castes (SC)
  // -------------------------
  "Mahar",
  "Mang",
  "Chamar",
  "Jatav",
  "Valmiki",
  "Dhor",
  "Madiga",
  "Pulaya",
  "Pasi",

  // -------------------------
  // Scheduled Tribes (ST)
  // -------------------------
  "Gond",
  "Warli",
  "Bhilla",
  "Santhal",
  "Oraon",
  "Munda",
  "Bhil",

  // -------------------------
  // Other Common Castes (Pan India)
  // -------------------------
  "Teli",
  "Kashyap",
  "Soni",
  "Lohar",
  "Sutar",
  "Carpenter",
  "Ahir",
  "Gujjar",
  "Sonar",
  "Chaurasiya",
  "Mali (North)",
  "Kori",
  "Barber (Nai)",
  "Badgujar",
  "Sutar",
  "Badhai",
  "Kumbhar",
  "Bhoi"
];

// -------------------------------
// SEED FUNCTION
// -------------------------------
const seedCasteData = async () => {
  try {
    await mongoose.connect("mongodb+srv://omkarpowar8724_db_user:89sGNkRbFMg821jK@matrimonial.zu5mauk.mongodb.net/Matrimonial");

    await Caste.deleteMany();
    console.log("🧹 Old caste data cleared.");

    const casteDocs = castes.map((name) => ({ name }));
    await Caste.insertMany(casteDocs);

    console.log("✅ Caste data seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding caste:", error);
    process.exit(1);
  }
};

seedCasteData();
