--!strict
-- Round manager for arena games: intermission in the lobby, then a match in
-- the arena, then a winner. Nothing else in the runtime knows about rounds --
-- it moves players between parts tagged ForgeLobbySpawn and ForgeArenaSpawn.

local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Net = require(Shared:WaitForChild("Net"))
local Economy = require(script.Parent:WaitForChild("Economy"))

local Rounds = {}

local statusEvent = Net.event("Round")
local inMatch: { [Player]: boolean } = {}

local function spawnPoints(tag: string): { BasePart }
	local points = {}
	for _, part in ipairs(CollectionService:GetTagged(tag)) do
		if part:IsA("BasePart") then
			table.insert(points, part)
		end
	end
	return points
end

local function teleport(player: Player, points: { BasePart }, slot: number)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root or not root:IsA("BasePart") or #points == 0 then
		return
	end
	local point = points[((slot - 1) % #points) + 1]
	root.CFrame = point.CFrame + Vector3.new(0, point.Size.Y / 2 + 4, 0)
end

local function alive(player: Player): boolean
	if not inMatch[player] or not player.Parent then
		return false
	end
	local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	return humanoid ~= nil and humanoid.Health > 0
end

local function broadcast(phase: string, seconds: number, message: string?)
	statusEvent:FireAllClients({ phase = phase, seconds = seconds, message = message })
end

local function runMatch()
	local lobby = spawnPoints("ForgeLobbySpawn")
	local arena = spawnPoints("ForgeArenaSpawn")
	local config = Settings.rounds or {}

	local intermission = config.intermission or 15
	for remaining = intermission, 1, -1 do
		broadcast("intermission", remaining, "Next match")
		task.wait(1)
	end

	local contenders = {}
	for _, player in ipairs(Players:GetPlayers()) do
		if player.Character then
			table.insert(contenders, player)
		end
	end

	if #contenders < (config.minPlayers or 2) then
		broadcast("waiting", 0, string.format("Waiting for %d players", config.minPlayers or 2))
		task.wait(5)
		return
	end

	for slot, player in ipairs(contenders) do
		inMatch[player] = true
		teleport(player, arena, slot)
		Economy.notify(player, "Match started -- last one standing wins", "info")
	end

	local duration = config.duration or 120
	local winner: Player? = nil
	for remaining = duration, 1, -1 do
		broadcast("match", remaining, "Match")

		local standing = {}
		for player in pairs(inMatch) do
			if alive(player) then
				table.insert(standing, player)
			else
				inMatch[player] = nil
			end
		end
		if #standing <= 1 then
			winner = standing[1]
			break
		end
		task.wait(1)
	end

	if winner then
		Economy.award(winner, config.reward or 150, "won the match")
		Economy.addWin(winner)
		broadcast("over", 0, string.format("%s wins!", winner.DisplayName))
	else
		broadcast("over", 0, "Time up -- no winner")
	end

	for player in pairs(inMatch) do
		inMatch[player] = nil
	end
	for slot, player in ipairs(Players:GetPlayers()) do
		teleport(player, lobby, slot)
	end
	task.wait(4)
end

function Rounds.start()
	task.spawn(function()
		while true do
			local ok, err = pcall(runMatch)
			if not ok then
				warn("[Forge] round failed: " .. tostring(err))
				task.wait(5)
			end
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		inMatch[player] = nil
	end)
end

return Rounds
