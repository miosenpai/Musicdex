import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import { useClient } from "../client";
import { DEFAULT_FETCH_CONFIG } from "./defaults";

export const usePlaylistWriter = (
  callbacks: UseMutationOptions<
    WriteablePlaylist,
    unknown,
    Partial<WriteablePlaylist>
  > = {}
) => {
  const { AxiosInstance } = useClient();
  const queryClient = useQueryClient();

  return useMutation(
    async (payload) =>
      (
        await AxiosInstance<WriteablePlaylist>("/musicdex/playlist", {
          method: "POST",
          data: payload,
        })
      ).data,
    {
      ...callbacks,
      onSuccess: (data, payload, ...rest) => {
        queryClient.cancelQueries(["playlist", payload.id]);
        queryClient.invalidateQueries(["playlist", payload.id]);
        queryClient.cancelQueries(["playlist-like", payload.id]);
        queryClient.invalidateQueries(["playlist-like", payload.id]);
        queryClient.invalidateQueries(["allPlaylists"]);
        if (callbacks.onSuccess) {
          callbacks.onSuccess(data, payload, ...rest);
        }
      },
    }
  );
};

export const usePlaylistUpdater = (
  config: UseMutationOptions<
    any,
    unknown,
    { playlistId: string; song: number | string; action: "add" | "delete" }
  > = {}
) => {
  const { AxiosInstance } = useClient();
  const queryClient = useQueryClient();

  return useMutation(
    async ({ playlistId, song, action }) =>
      await AxiosInstance(`/musicdex/playlist/${playlistId}/${song}`, {
        method: action === "add" ? "GET" : "DELETE",
      }),
    {
      ...config,
      onSuccess: (data, payload, ...rest) => {
        console.log("invalidating queries:", ["playlist", payload.playlistId]);
        queryClient.cancelQueries(["playlist", payload.playlistId]);
        queryClient.cancelQueries(["playlist-like", payload.playlistId]);
        // apparently start-ui has some support for querying the cache and doing stuff to it?... seems interesting.
        // TODO (optional): modify the query cache for playlist if the song is a full Song object already.
        // it seems this code is part of the Optimistic Updating: https://react-query.tanstack.com/guides/optimistic-updates
        // queryClient
        //     .getQueryCache()
        //     .findAll('playlist')
        //     .forEach(({ queryKey }) => {
        //         queryClient.setQueryData(queryKey, (cachedData: UserList) => {
        //             if (!cachedData) return;
        //             return {
        //                 ...cachedData,
        //                 content: (cachedData.content || []).map((user) =>
        //                     user.id === data.id ? data : user
        //                 ),
        //             };
        //         });
        //     });
        queryClient.invalidateQueries(["playlist", payload.playlistId]);
        queryClient.invalidateQueries(["playlist-like", payload.playlistId]);
        if (config.onSuccess) {
          config.onSuccess(data, payload, ...rest);
        }
      },
    }
  );
};

export const usePlaylistDeleter = (
  config: UseMutationOptions<any, unknown, { playlistId: string }> = {}
) => {
  const { AxiosInstance } = useClient();
  const queryClient = useQueryClient();

  return useMutation(
    async ({ playlistId }) =>
      await AxiosInstance(`/musicdex/playlist/${playlistId}`, {
        method: "DELETE",
      }),
    {
      ...config,
      onSuccess: (data, payload, ...rest) => {
        queryClient.cancelQueries(["playlist", payload.playlistId]);
        queryClient.cancelQueries(["playlist-like", payload.playlistId]);
        // apparently start-ui has some support for querying the cache and doing stuff to it?... seems interesting.
        // TODO (optional): modify the query cache for playlist if the song is a full Song object already.
        // it seems this code is part of the Optimistic Updating: https://react-query.tanstack.com/guides/optimistic-updates
        // queryClient
        //     .getQueryCache()
        //     .findAll('playlist')
        //     .forEach(({ queryKey }) => {
        //         queryClient.setQueryData(queryKey, (cachedData: UserList) => {
        //             if (!cachedData) return;
        //             return {
        //                 ...cachedData,
        //                 content: (cachedData.content || []).map((user) =>
        //                     user.id === data.id ? data : user
        //                 ),
        //             };
        //         });
        //     });
        queryClient.invalidateQueries(["playlist", payload.playlistId]);
        queryClient.invalidateQueries(["playlist-like", payload.playlistId]);
        queryClient.invalidateQueries(["allPlaylists"]);

        if (config.onSuccess) {
          config.onSuccess(data, payload, ...rest);
        }
      },
    }
  );
};

export const usePlaylist = (
  playlistId: string,
  config: UseQueryOptions<PlaylistFull, unknown, PlaylistFull, string[]> = {}
) => {
  const queryClient = useQueryClient();
  const { AxiosInstance, isLoggedIn } = useClient();
  const result = useQuery(
    ["playlist", playlistId],
    async (q): Promise<PlaylistFull> => {
      // fetch cached
      console.log("fetching", q);
      const cached: PlaylistFull | undefined = queryClient.getQueryData([
        "playlist",
        playlistId,
      ]);

      let playlistReq = AxiosInstance<PlaylistFull>(
        `/musicdex/playlist/${playlistId}`
      );
      const likeStatusReq = AxiosInstance<boolean[]>(
        `/musicdex/playlist/${playlistId}/likeCheck`
      );

      // Cached flow
      if (cached) {
        const cacheCheckReq = AxiosInstance<PlaylistFull>(
          `/musicdex/playlist/${q.queryKey[1]}`,
          {
            headers: {
              "If-Modified-Since":
                cached.updated_at?.toString() ?? cached.updated_at,
            },
          }
        ); // try fetching with If-Modified-Since, Server returns 304 if not modified.

        // Not logged in, just check cache 304
        if (!isLoggedIn) {
          const { data: newdata } = await cacheCheckReq;
          if (!newdata?.id) return cached;
          else return newdata;
        }

        // Parallel request
        const [{ data: playlist }, { data: likeStatus }] = await Promise.all([
          cacheCheckReq,
          likeStatusReq,
        ]);

        // Check if content matches, and update cache
        if (likeStatus.length === playlist.content?.length) {
          playlist.content.forEach((song, index) => {
            queryClient.setQueryData(["BLK:", song.id], likeStatus[index]);
          });
        }
        return playlist;
      }

      // Uncached request flow

      // Not logged in, just request
      if (!isLoggedIn) return (await playlistReq).data;

      // Parallel request for like status and playlist
      const [{ data: playlist }, { data: likeStatus }] = await Promise.all([
        playlistReq,
        likeStatusReq,
      ]);

      if (likeStatus.length === playlist.content?.length) {
        playlist.content.forEach((song, index) => {
          queryClient.setQueryData(["BLK:", song.id], likeStatus[index]);
        });
      }

      return playlist;
    },
    {
      ...DEFAULT_FETCH_CONFIG,
      ...config,
    }
  );

  return result;
};

export const useMyPlaylists = (
  config: UseQueryOptions<
    PlaylistStub[],
    unknown,
    PlaylistStub[],
    string[]
  > = {}
) => {
  const { AxiosInstance, isLoggedIn } = useClient();

  const result = useQuery(
    ["allPlaylists"],
    async (q): Promise<PlaylistStub[]> => {
      // fetch cached
      if (!isLoggedIn) return [];
      const playlists = (
        await AxiosInstance<PlaylistStub[]>(`/musicdex/playlist/`)
      ).data;
      playlists.sort(
        (a, b) =>
          new Date(b.updated_at).valueOf() - new Date(a.updated_at).valueOf()
      );
      return playlists;
    },
    {
      ...DEFAULT_FETCH_CONFIG,
      ...config,
    }
  );

  return result;
};

export const useStarredPlaylists = () => {
  const { AxiosInstance, isLoggedIn } = useClient();

  return useQuery(
    ["starredPlaylists"],
    async (): Promise<PlaylistStub[]> => {
      // fetch cached
      if (!isLoggedIn) return [];
      return (await AxiosInstance<PlaylistStub[]>(`/musicdex/star/`)).data;
    },
    {
      ...DEFAULT_FETCH_CONFIG,
      cacheTime: 1000 * 60 * 60 * 24,
    }
  );
};

export const usePlaylistStarUpdater = (
  callbacks: UseMutationOptions<
    any,
    unknown,
    { playlist_id: string; action: "add" | "delete" }
  > = {}
) => {
  const { AxiosInstance } = useClient();
  const queryClient = useQueryClient();

  return useMutation(
    async (payload) =>
      (
        await AxiosInstance("/musicdex/star/", {
          method: payload.action === "delete" ? "DELETE" : "POST",
          data: { playlist_id: payload.playlist_id },
        })
      ).data,
    {
      ...callbacks,
      onSuccess: (data, payload, ...rest) => {
        queryClient.cancelQueries(["starredPlaylists"]);
        queryClient.invalidateQueries(["starredPlaylists"]);
        // queryClient.invalidateQueries([`likeSongStatus-${payload.song_id}`]);
        if (callbacks.onSuccess) {
          callbacks.onSuccess(data, payload, ...rest);
        }
      },
    }
  );
};
