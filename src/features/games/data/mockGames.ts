import type { Game, Franchise } from "../../../types";

export const MOCK_GAMES: Game[] = [
    {
        id: "1",
        igdb_id: 1020,
        title: "Elden Ring",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
        status: "playing",
        rating: 95
    },
    {
        id: "2",
        igdb_id: 119133,
        title: "Hades II",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7uob.jpg",
        status: "backlog",
        rating: 90
    },
    {
        id: "3",
        igdb_id: 125,
        title: "God of War",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7m.jpg",
        status: "finished",
        rating: 98
    },
    {
        id: "4",
        igdb_id: 1009,
        title: "The Last of Us Part II",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2961.jpg",
        status: "finished",
        rating: 94
    },
    {
        id: "5",
        igdb_id: 1942,
        title: "The Witcher 3: Wild Hunt",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg",
        status: "playing",
        rating: 97
    }
];

export const MOCK_FRANCHISES: Franchise[] = [
    {
        id: "f1",
        name: "Assassin's Creed",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tbd.jpg",
        games: [
            {
                id: "ac1",
                igdb_id: 121,
                title: "Assassin's Creed",
                cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tbd.jpg",
                status: "finished",
                release_date: "2007"
            },
            {
                id: "ac2",
                igdb_id: 122,
                title: "Assassin's Creed II",
                cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2vace.jpg",
                status: "finished",
                release_date: "2009"
            },
            {
                id: "ac3",
                igdb_id: 123,
                title: "Assassin's Creed: Brotherhood",
                cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tbi.jpg",
                status: "finished",
                release_date: "2010"
            },
            {
                id: "ac4",
                igdb_id: 115064,
                title: "Assassin's Creed Valhalla",
                cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2381.jpg",
                status: "backlog",
                release_date: "2020"
            }
        ]
    },
    {
        id: "f2",
        name: "Resident Evil",
        cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co26n5.jpg",
        games: [
            {
                id: "re1",
                igdb_id: 1000,
                title: "Resident Evil Village",
                cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co26n5.jpg",
                status: "finished"
            },
            {
                id: "re2",
                igdb_id: 1001,
                title: "Resident Evil 4 Remake",
                cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5v7v.jpg",
                status: "playing"
            }
        ]
    }
];
