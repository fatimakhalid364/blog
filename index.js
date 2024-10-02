import express from 'express';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(
    session({
        secret: "TOPSECRETWORD",
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            maxAge: 30 * 24 * 60 * 60 * 1000
        }
    })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "users",
    password: "Idonotknow@123",
    port: 5432,
});
db.connect();





app.get('/', async (req, res) => {
    const result1 = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id ORDER BY views DESC LIMIT 6");
    const popBlogs = result1.rows;
    res.render("header.ejs", {
        popBlogs: popBlogs
    });
});
app.post("/home", async (req, res) => {
    const result1 = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id ORDER BY views DESC LIMIT 6");
    const popBlogs = result1.rows;
    res.render("header.ejs", {
        popBlogs: popBlogs
    });
});

app.post('/about', (req, res) => {
    res.render("about.ejs");
});

app.post('/signup', (req, res) => {
    res.render("signup.ejs");
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

app.post("/signin", (req, res) => {
    res.render("signin.ejs");
});

app.get("/signin", (req, res)=>{
    res.render("signin.ejs")
});

app.get("/blogs", async (req, res) => {
    if (req.isAuthenticated()) {
    const user = req.user;
    console.log(user);
    const categories = ["Entertainment", "Politics", "Religion", "Food", "Science", "Arts", "Others", "Culture", "Philosophy"]; 
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id ORDER BY created_at DESC");
    const bloggers = result.rows;
    res.render("blogs.ejs", {
            bloggers: bloggers,
            user: user,
            categories: categories
        });
    }else {
        res.redirect("/signup");
    }
});

app.get("/planner", async (req, res) => {
    const user = req.user;
    const result1 = await db.query("SELECT * FROM authentication JOIN planner ON authentication.id = user_planner_id  WHERE user_planner_id = $1",
    [user.id]
    );
    const userplans = result1.rows;
    res.render("planner.ejs", {
        userplans: userplans
    });
});

app.post("/blogz", (req, res) => {
    if (req.isAuthenticated()) {
        console.log(req.isAuthenticated());
        res.redirect("/blogs");
    }else {
        console.log(req.isAuthenticated());
        res.redirect("/signup");
    }

});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/signin');
    });

});

app.post("/back", (req, res) => {
    res.redirect("/blogs");
});

app.post("/hunt", async (req, res) => {
    const user = req.user;
    const target = req.body.wantedlist;
try{
    const result = await db.query ("Select * from blogsList WHERE title = $1", [target]);
    const mySearch = result.rows[0];
    res.render("hunt.ejs", {
        mySearch: mySearch,
        user: user
    })

}catch(err){
    res.send("Blog not found");
}
});

app.get('/search', async (req, res) => {
    const searchString = req.query.searchString;

    try {
        const result = await db.query("SELECT title FROM blogsList WHERE title ILIKE $1", [`%${searchString}%`]);
        const filteredItems = result.rows;
        res.json(filteredItems);
    } catch (error) {
        console.error('Error executing database query:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
});


app.post(
        "/register",
        passport.authenticate("local-register", {
            successRedirect: "/blogs",
            failureRedirect: "/signup",
        })
);

app.post("/login",
    passport.authenticate("local-login", {
        successRedirect: "/blogs",
        failureRedirect: "/signup",
    })
);

app.post("/blog", async (req, res) => {
    if(req.isAuthenticated()) {
    const user = req.user;
    const blogger = req.body.blog;
    await db.query("UPDATE blogsList SET views = views + 1 WHERE title = $1", [blogger]);
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE title = $1",
    [blogger]
    );
    const neededBlog = result.rows[0];
    
    const result2 = await db.query("SELECT * FROM blogsList WHERE user_id = $1", [neededBlog.user_id]);
    const more = result2.rows;
    res.render("content.ejs", {
        user: user,
        title: neededBlog.title,
        name: neededBlog.name,
        content: neededBlog.content,
        time: neededBlog.created_at,
        idToMatch: neededBlog.user_id,
        name: neededBlog.name,
        more: more
    });
}else{
    res.redirect("/signin");
}
});

app.post("/type", (req, res) => {
    if (req.isAuthenticated()) {
    const writerId = req.body.credential;
    res.render("type.ejs", {
        id: writerId
    });
}else{
    res.redirect("/signin");
}
});

app.post("/yours", async (req, res) => {
    if (req.isAuthenticated()){
    const prepC = req.body.yourcategory.toLowerCase();
    const category = prepC.charAt(0).toUpperCase() + prepC.slice(1);


    const id = req.body.authorid;
    const author = req.body.author;
    const blogContent = req.body.yourtext;
    const title = req.body.yourtitle;
    const resultInsert = await db.query("INSERT INTO blogsList (user_id, title, content, name, views, category) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, title, blogContent, author, 0, category]
    );
    //const resultSelect = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id RETURNING *");
    //req.session.newBlogsList = resultSelect.rows;
    res.redirect("/blogs");
    }else{
        res.redirect("/signin");
    }
});

app.post("/myblogs", async (req, res) => {
    if (req.isAuthenticated()) {
    const categories = ["Entertainment", "Politics", "Religion", "Food", "Science", "Arts", "Others", "Culture", "Philosophy"]; 
    const user = req.user;
    const myBlogId = req.body.myblogid;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE user_id = $1",
    [myBlogId]
    );
    const myBlogs = result.rows;
    res.render("myblogs.ejs", {
        myBlogs: myBlogs,
        user: user,
        categories: categories
    });
}else{
    res.redirect("/signin");
}
});

app.post("/Entertainment", async (req, res) => {
    if (req.isAuthenticated()) {
    const categories = ["Entertainment", "Politics", "Religion", "Food", "Science", "Arts", "Others", "Culture", "Philosophy"]; 
    const user = req.user;
    const ent = req.body.Entertainment;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [ent]
    );
    const entBlogs = result.rows;
    res.render ("ent.ejs", {
        entBlogs: entBlogs,
        user: user,
        categories: categories
    })
}else{
    res.redirect("signin");
}
});

app.post("/Politics", async (req, res) => {
    if (req.isAuthenticated()) {
    const pol = req.body.Politics;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [pol]
    );
    const polBlogs = result.rows;
    res.render ("pol.ejs", {
        polBlogs: polBlogs
    })
    }else{
        res.redirect("/signin");
    }
});

app.post("/Religion", async (req, res) => {
    if (req.isAuthenticated()) {
    const rel = req.body.Religion;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [rel]
    );
    const relBlogs = result.rows;
    res.render ("rel.ejs", {
        relBlogs: relBlogs
    });
    }else{
        res.redirect("/signin");
    }
});

app.post("/Food", async (req, res) => {
    if (req.isAuthenticated()) {
    const food = req.body.Food;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [food]
    );
    const foodBlogs = result.rows;
    res.render ("food.ejs", {
        foodBlogs: foodBlogs
    });
    }else{
        res.redirect("/signin");
    }
});

app.post("/Science", async (req, res) => {
    if (req.isAuthenticated()) {
    const sci = req.body.Science;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [sci]
    );
    const sciBlogs = result.rows;
    res.render ("sci.ejs", {
        sciBlogs: sciBlogs
    })
    }else{
        res.redirect("/signin");
    }
});

app.post("/Culture", async (req, res) => {
    if (req.isAuthenticated()) {
    const cul = req.body.Culture;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [cul]
    );
    const culBlogs = result.rows;
    res.render ("cul.ejs", {
        culBlogs: culBlogs
    });
    }else{
        res.redirect("/signin");
    }
});

app.post("/Others", async (req, res) => {
    if (req.isAuthenticated()) {
    const others = req.body.Others;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [others]
    );
    const othersBlogs = result.rows;
    res.render ("others.ejs", {
        othersBlogs: othersBlogs
    });
}else{
    res.redirect("/signin");
}
});

app.post("/Arts", async (req, res) => {
    if (req.isAuthenticated()) {
    const arts = req.body.Arts;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [arts]
    );
    const artsBlogs = result.rows;
    res.render ("arts.ejs", {
        artsBlogs: artsBlogs
    })
}else{
    res.redirect("/signin");
}
});

app.post("/Philosophy", async (req, res) => {
    if (req.isAuthenticated()) {
    const phil = req.body.Philosophy;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE category = $1",
    [phil]
    );
    const philBlogs = result.rows;
    res.render ("arts.ejs", {
        philBlogs: philBlogs
    })
    }else{
        res.redirect("/signin");
    }
});

app.post("/myrealblogs", async (req, res) => {
    const myRealBlogTitle = req.body.myrblog;
    const result = await db.query("SELECT * FROM authentication JOIN blogsList ON authentication.id = user_id WHERE title = $1",
    [myRealBlogTitle]
    );
    const myRealBlog = result.rows[0];
    res.render("myrealblog.ejs", {
        myRealBlog: myRealBlog
    });
})

app.post("/add", async (req, res) => {
    const newPlan = req.body.newplan;
    const day = req.body.addplanday;
    const user = req.user;
    const result = await db.query("INSERT INTO planner (plans, days, user_planner_id) VALUES ($1, $2, $3) RETURNING *",
    [newPlan, day, user.id]
    );
    const userplans = result.rows;
    res.redirect("/blogs");
});

app.post("/delete", async (req, res) => {
    const deltask = req.body.deltaskid;
    const result = await db.query("DELETE FROM planner WHERE id = $1",
    [deltask]
    );
    const userplans = result.rows;
    res.redirect("/blogs");

});

app.post("/edit", async (req, res) => {
    const taskAfterUpdate = req.body.edittask;
    const taskToUpdateId = req.body.changetask;
    const result= await db.query("UPDATE planner SET plans = $1 WHERE id = $2",
    [taskAfterUpdate, taskToUpdateId]
    );
    const userplans = result.rows;
    res.redirect("/blogs");

});

passport.use("local-register",
    new Strategy(async function (username, password, done) {
        try {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const result = await db.query(
                "INSERT INTO authentication (email, password) VALUES ($1, $2) RETURNING *",
                [username, hashedPassword]
            );
            return done(null, result.rows[0]);
        } catch (error) {
            console.error("Error registering user:", error);
            return done(error);
        }
    })
);     

passport.use("local-login",
    new Strategy(async function verify(username, password, cb) {
        try {
        const result = await db.query("SELECT * FROM authentication WHERE email = $1 ", [
            username,
        ]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedPassword = user.password;
            bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return cb(err);
            } else {
                if (valid) {
                return cb(null, user);
                } else {
                return cb(null, false);
            }
            }
        });
        } else {
            return cb("User not found");
        }
    } catch (err) {
        console.log(err);
    }
    })
);

passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((user, cb) => {
    cb(null, user);
});



app.listen (port, ()=> {
    console.log("listening on port " + port);
})