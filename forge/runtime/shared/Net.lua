--!strict
-- Remote plumbing. The server creates the remotes on first use; the client
-- waits for them, so neither side cares about load order.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local FOLDER_NAME = "ForgeNet"
local WAIT_TIMEOUT = 30

local Net = {}

local function container(): Instance
	if RunService:IsServer() then
		local folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		if not folder then
			folder = Instance.new("Folder")
			folder.Name = FOLDER_NAME
			folder.Parent = ReplicatedStorage
		end
		return folder
	end

	local folder = ReplicatedStorage:WaitForChild(FOLDER_NAME, WAIT_TIMEOUT)
	if not folder then
		error("[Forge] ForgeNet never replicated -- is the server runtime running?")
	end
	return folder
end

local function remote(className: string, name: string): Instance
	local parent = container()
	if RunService:IsServer() then
		local existing = parent:FindFirstChild(name)
		if existing then
			return existing
		end
		local created = Instance.new(className)
		created.Name = name
		created.Parent = parent
		return created
	end

	local found = parent:WaitForChild(name, WAIT_TIMEOUT)
	if not found then
		error(string.format("[Forge] remote %q never replicated", name))
	end
	return found
end

function Net.event(name: string): RemoteEvent
	return remote("RemoteEvent", name) :: RemoteEvent
end

function Net.fn(name: string): RemoteFunction
	return remote("RemoteFunction", name) :: RemoteFunction
end

return Net
